import { tarifasClasicas, tarifasNuevas } from '../seed/catalogosIniciales.ts';
import type { ConsumoReciboCfe, ReciboCfeParseado } from '../schemas/reciboCfe.ts';
import {
  aTitulo,
  distanciaEdicion,
  expandirEstado,
  limpiarTexto,
  sinAcentos,
} from './textoRecibo.ts';

/**
 * Extracción de datos de un recibo CFE a partir de su texto.
 *
 * Función pura: recibe el texto de cada página (de la capa de texto del PDF o
 * de un OCR) y devuelve los datos más las advertencias. No sabe de dónde
 * viene el texto; por eso es tolerante: trabaja por **patrones**, no por
 * posición, y asume que el OCR puede confundir caracteres parecidos
 * (`1B` → `15B`, `$` → `S`, `0` → `O`).
 *
 * Regla de oro: lo que no se puede leer queda vacío y se avisa en
 * `advertencias`. Nunca se rellena con un valor inventado.
 */

export interface ResultadoAnalisisRecibo {
  datos: ReciboCfeParseado;
  advertencias: string[];
}

/** Máximo de periodos del histórico que se cargan al Paso 2. */
export const PERIODOS_HISTORICO = 6;

const TARIFAS_CONOCIDAS = [...tarifasClasicas, ...tarifasNuevas];

const MESES: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12,
};

// ── Utilidades de bajo nivel ─────────────────────────────────────────────

/** Parte un texto en líneas y descarta las vacías, conservando los huecos internos. */
function lineasCrudas(texto: string): string[] {
  return texto.split(/\r?\n/).filter((linea) => linea.trim() !== '');
}

/**
 * Con el OCR, las columnas vecinas quedan separadas por huecos de 3+ espacios
 * ("MORENO ALVARADO MARTIN        HR"). El primer segmento es el de la columna
 * que interesa; lo demás suele ser ruido de la columna de al lado.
 */
function primerSegmento(linea: string): string {
  return limpiarTexto(linea.trim().split(/\s{3,}/)[0] ?? '');
}

function iso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** `13`, `AGO`, `26` → `2026-08-13`; `null` si el mes no se reconoce. */
function fechaCorta(dia: string, mes: string, anio: string): string | null {
  const numeroMes = MESES[sinAcentos(mes).toUpperCase()];
  if (!numeroMes) return null;
  return iso(2000 + Number(anio), numeroMes, Number(dia));
}

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/** Confusiones típicas del OCR dentro de un campo que debe ser solo numérico. */
function soloDigitos(texto: string): string {
  return texto
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/\D/g, '');
}

// ── Campos sueltos ───────────────────────────────────────────────────────

function extraerNumeroServicio(texto: string, advertencias: string[]): string {
  const conEtiqueta = /N[OÓ0]\.?\s*DE\s*SERVICIO\s*:?\s*([0-9OoIl|\s]{11,20})/i.exec(texto);
  if (conEtiqueta) {
    const digitos = soloDigitos(conEtiqueta[1]!);
    if (digitos.length >= 12) return digitos.slice(0, 12);
    advertencias.push(
      `El número de servicio leído tiene ${digitos.length} dígitos y debería tener 12 dígitos: revísalo.`
    );
    return digitos;
  }

  // Sin etiqueta legible: cualquier número de exactamente 12 dígitos aislado.
  const suelto = /(?<!\d)(\d{12})(?!\d)/.exec(texto);
  if (suelto) {
    advertencias.push('No se leyó la etiqueta "No. de servicio"; se tomó un número de 12 dígitos del recibo.');
    return suelto[1]!;
  }

  advertencias.push('No se encontró el número de servicio.');
  return '';
}

/**
 * La tarifa viene pegada a lo que sigue ("TARIFA:1BNO. MEDIDOR:5GRR02"), así
 * que se corta antes de "NO. MEDIDOR" / "MULTIPLICADOR" en vez de confiar en
 * un espacio. Si el OCR metió un carácter de más ("15B"), se intenta repararlo
 * quitando uno hasta caer en una tarifa conocida, y se avisa.
 */
function extraerTarifa(texto: string, advertencias: string[]): string {
  const linea = lineasCrudas(texto).find((l) => /TARIFA\s*:/i.test(l));
  if (!linea) {
    advertencias.push('No se encontró la tarifa.');
    return '';
  }

  const despues = linea.slice(linea.search(/TARIFA\s*:/i)).replace(/^TARIFA\s*:/i, '');
  const corte = despues.search(/N[OÓ0]\.?\s*MEDIDOR|MULTIPLICADOR/i);
  let token = limpiarTexto(corte >= 0 ? despues.slice(0, corte) : despues)
    .toUpperCase()
    .replace(/\s+/g, '');

  if (token === '') {
    advertencias.push('La tarifa del recibo está vacía.');
    return '';
  }
  if (/^0\d$/.test(token)) token = String(Number(token)); // "01" → "1"
  if (TARIFAS_CONOCIDAS.includes(token)) return token;

  for (let i = 0; i < token.length; i++) {
    const candidato = token.slice(0, i) + token.slice(i + 1);
    if (TARIFAS_CONOCIDAS.includes(candidato)) {
      advertencias.push(`La tarifa se leyó como "${token}" y se corrigió a "${candidato}": verifícala.`);
      return candidato;
    }
  }

  advertencias.push(`La tarifa "${token}" no está en el catálogo (${TARIFAS_CONOCIDAS.join(', ')}): revísala.`);
  return token;
}

function extraerHilos(texto: string, advertencias: string[]): ReciboCfeParseado['hilos'] {
  const m = /N[OÚU0]\.?\s*HILOS\s*:?\s*([123])/i.exec(texto);
  if (!m) {
    advertencias.push('No se encontró el número de hilos.');
    return '';
  }
  return m[1] === '1' ? '1 hilo' : m[1] === '2' ? '2 hilos' : '3 hilos';
}

function extraerPeriodoFacturado(texto: string): ReciboCfeParseado['periodoFacturado'] {
  const m =
    /PERIODO\s*FACTURADO\s*:?\s*(\d{1,2})\s*([A-ZÁ]{3})\s*(\d{2})\s*[-–]\s*(\d{1,2})\s*([A-ZÁ]{3})\s*(\d{2})/i.exec(
      texto
    );
  if (!m) return null;
  const inicio = fechaCorta(m[1]!, m[2]!, m[3]!);
  const termino = fechaCorta(m[4]!, m[5]!, m[6]!);
  return inicio && termino ? { inicio, termino } : null;
}

// ── Titular y domicilio ──────────────────────────────────────────────────

/** Líneas del encabezado/importe que preceden al titular y no son el titular. */
const NO_ES_TITULAR =
  /comisi[oó]n|federal|electricidad|paseo|reforma|alcald|cuauht|c[oó]digo\s*postal|RFC|TOTAL\s*A\s*PAGAR|PESOS|^[\W\d_]*$/i;

const PARTICULAS_NOMBRE = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'E']);

/** Quita fichas sueltas de 1–2 letras que el OCR deja al final ("... MARTIN HR"). */
function sinRuidoFinal(nombre: string): string {
  const fichas = nombre.split(' ');
  while (
    fichas.length > 2 &&
    fichas[fichas.length - 1]!.length <= 2 &&
    !PARTICULAS_NOMBRE.has(fichas[fichas.length - 1]!.toUpperCase())
  ) {
    fichas.pop();
  }
  return fichas.join(' ');
}

interface Domicilio {
  nombreCliente: string;
  municipio: string;
  codigoPostal: string;
  localidad: string;
  estado: string;
  /** Calle, número y colonia: las líneas entre el titular y la del código postal. */
  calle: string;
}

/**
 * "NO. MEDIDOR:5GRR02" va pegado a la tarifa y a veces al multiplicador. El
 * medidor es alfanumérico; se corta antes de "MULTIPLICADOR" y de cualquier
 * espacio. Sin etiqueta legible queda vacío (el asesor lo captura a mano).
 */
function extraerNumeroMedidor(texto: string): string {
  const m = /N[OÓ0]\.?\s*MEDIDOR\s*:?\s*([A-Z0-9-]{3,16}?)(?=\s|MULTIPLICADOR|$)/im.exec(texto);
  return m ? m[1]!.toUpperCase() : '';
}

function extraerTitularYDomicilio(texto: string, advertencias: string[]): Domicilio {
  const lineas = lineasCrudas(texto);
  const indiceServicio = lineas.findIndex((l) => /N[OÓ0]\.?\s*DE\s*SERVICIO/i.test(l));
  const bloque = indiceServicio >= 0 ? lineas.slice(0, indiceServicio) : lineas;

  // Titular: la primera línea del bloque que no es encabezado ni importe.
  const lineaTitular = bloque
    .map(primerSegmento)
    .find((l) => l !== '' && /[A-ZÁÉÍÓÚÑ]{2,}/i.test(l) && !NO_ES_TITULAR.test(l) && !/\d/.test(l));
  const nombreCliente = lineaTitular ? sinRuidoFinal(lineaTitular) : '';
  if (nombreCliente === '') advertencias.push('No se pudo leer el nombre del titular.');

  // Código postal y municipio: "SXTAPA LA CONCEPCIONC.P.48280".
  let municipio = '';
  let codigoPostal = '';
  let indiceCp = -1;
  for (let i = 0; i < bloque.length; i++) {
    const m = /^(.*?)\s*C\.?\s*P\.?\s*:?\s*(\d{5})/i.exec(primerSegmento(bloque[i]!));
    if (m) {
      municipio = limpiarTexto(m[1]!);
      codigoPostal = m[2]!;
      indiceCp = i;
      break;
    }
  }

  // Calle: lo que hay entre el titular y la línea del código postal.
  const indiceTitular = bloque.findIndex((l) => primerSegmento(l) === lineaTitular);
  const calle =
    indiceCp > indiceTitular && indiceTitular >= 0
      ? bloque
          .slice(indiceTitular + 1, indiceCp)
          .map(primerSegmento)
          // Sin filtrar "reforma", "federal"…: el encabezado de CFE va antes del titular
          // y aquí ya solo hay líneas del domicilio, cuyas calles pueden llamarse así.
          .filter((l) => /[A-ZÁÉÍÓÚÑ0-9]{2,}/i.test(l))
          .join(', ')
      : '';

  // Localidad y estado: "IXTAPA,NAY." (la línea siguiente al código postal).
  let localidad = '';
  let estado = '';
  const candidatas = indiceCp >= 0 ? bloque.slice(indiceCp + 1) : bloque;
  for (const candidata of candidatas) {
    const m = /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .]*?)\s*,\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ. ]{1,24}?)\s*\.?\s*$/i.exec(
      primerSegmento(candidata)
    );
    if (!m) continue;
    localidad = aTitulo(m[1]!);
    const expandido = expandirEstado(m[2]!);
    if (expandido) {
      estado = expandido;
    } else {
      advertencias.push(`No se reconoció el estado "${limpiarTexto(m[2]!)}" del domicilio.`);
    }
    break;
  }
  if (localidad === '') advertencias.push('No se pudo leer la localidad del domicilio.');

  // El impreso a veces trae una letra equivocada en el municipio ("SXTAPA"):
  // si su primera palabra está a una edición de la localidad, se corrige.
  if (municipio !== '' && localidad !== '') {
    const [primera = '', ...resto] = municipio.split(' ');
    if (
      primera.length >= 4 &&
      primera.toUpperCase() !== localidad.toUpperCase() &&
      distanciaEdicion(sinAcentos(primera).toUpperCase(), sinAcentos(localidad).toUpperCase()) <= 1
    ) {
      municipio = [localidad, ...resto].join(' ');
    }
  }

  return {
    nombreCliente: aTitulo(nombreCliente),
    municipio: aTitulo(municipio),
    codigoPostal,
    localidad,
    estado,
    calle: aTitulo(calle),
  };
}

/**
 * CFE imprime "APELLIDOS NOMBRE": con 3 fichas, paterno + materno + nombre;
 * con 2, paterno + nombre; con 4 o más, paterno + materno + el resto como
 * nombre. Es una heurística —los apellidos compuestos la engañan—, por eso el
 * resultado se ofrece como sugerencia y la interfaz debe dejar revisarlo.
 */
export function separarNombreTitular(nombreCliente: string): ReciboCfeParseado['contacto'] {
  const fichas = limpiarTexto(nombreCliente).split(' ').filter(Boolean);
  if (fichas.length === 0) return { nombre: '', apellidoPaterno: '', apellidoMaterno: '' };
  if (fichas.length === 1) return { nombre: fichas[0]!, apellidoPaterno: '', apellidoMaterno: '' };
  if (fichas.length === 2) return { nombre: fichas[1]!, apellidoPaterno: fichas[0]!, apellidoMaterno: '' };
  return {
    apellidoPaterno: fichas[0]!,
    apellidoMaterno: fichas[1]!,
    nombre: fichas.slice(2).join(' '),
  };
}

// ── Histórico de consumo ─────────────────────────────────────────────────

/**
 * Una fila: "del 12 JUN 26 al 13 AGO 26   1741   $12,908.00   $12,908.00".
 * Los espacios entre día/mes/año son opcionales porque el OCR a veces los
 * junta ("15DIC 25", "14 OCT25"); la segunda cifra es la columna "Pagos".
 */
const FILA_HISTORICO =
  /del\s*(\d{1,2})\s*([A-ZÁ]{3})\s*(\d{2})\s*al\s*(\d{1,2})\s*([A-ZÁ]{3})\s*(\d{2})\s+([\dOIl|.,]+)\s+[$S5]?\s*([\d,]+\.\d{2})(?:\s+[$S5]?\s*([\d,]+\.\d{2}))?/gi;

function extraerHistorico(texto: string, advertencias: string[]): ConsumoReciboCfe[] {
  const filas = new Map<string, ConsumoReciboCfe>();

  for (const linea of lineasCrudas(texto)) {
    for (const m of linea.matchAll(FILA_HISTORICO)) {
      const inicio = fechaCorta(m[1]!, m[2]!, m[3]!);
      const termino = fechaCorta(m[4]!, m[5]!, m[6]!);
      if (!inicio || !termino) continue;

      const kwh = Number(soloDigitos(m[7]!));
      const importe = Number(m[8]!.replace(/,/g, ''));
      const pagos = m[9] ? Number(m[9].replace(/,/g, '')) : null;
      if (!Number.isFinite(kwh) || !Number.isFinite(importe)) continue;

      if (pagos !== null && Math.abs(pagos - importe) >= 0.005) {
        advertencias.push(
          `En el periodo que termina el ${termino} el importe ($${importe.toFixed(2)}) y los pagos ($${pagos.toFixed(2)}) no coinciden: revisa esa fila.`
        );
      }

      // Si el mismo periodo se leyó dos veces (p. ej. de dos pasadas de OCR), manda la primera.
      const clave = `${inicio}|${termino}`;
      if (!filas.has(clave)) filas.set(clave, { inicio, termino, kwh, importe });
    }
  }

  // La tabla va del más reciente al más antiguo: se ordena por si el texto
  // llegó mezclado y se queda con los más recientes.
  const ordenadas = [...filas.values()].sort((a, b) => b.termino.localeCompare(a.termino));
  const seleccion = ordenadas.slice(0, PERIODOS_HISTORICO);

  if (seleccion.length === 0) {
    advertencias.push('No se encontró la tabla de consumo histórico.');
  } else if (seleccion.length < PERIODOS_HISTORICO) {
    advertencias.push(
      `Solo se leyeron ${seleccion.length} de ${PERIODOS_HISTORICO} periodos del histórico: completa los que falten.`
    );
  }

  // Los periodos deben encadenarse (el inicio de uno es el fin del siguiente).
  for (let i = 0; i < seleccion.length - 1; i++) {
    const reciente = seleccion[i]!;
    const anterior = seleccion[i + 1]!;
    if (Math.abs(dias(anterior.termino, reciente.inicio)) > 3) {
      advertencias.push(
        `Los periodos del histórico no son continuos entre ${anterior.termino} y ${reciente.inicio}: revisa las fechas.`
      );
    }
  }

  return seleccion;
}

function detectarPeriodo(consumos: ConsumoReciboCfe[]): ReciboCfeParseado['periodo'] {
  if (consumos.length === 0) return null;
  const duraciones = consumos.map((c) => dias(c.inicio, c.termino)).sort((a, b) => a - b);
  const mediana = duraciones[Math.floor(duraciones.length / 2)]!;
  if (mediana >= 45 && mediana <= 75) return 'Bimestral';
  if (mediana >= 20 && mediana < 45) return 'Mensual';
  return null;
}

// ── Entrada principal ────────────────────────────────────────────────────

/** `true` si se leyó algo que identifique un recibo CFE (servicio o histórico). */
export function reciboReconocido(datos: ReciboCfeParseado): boolean {
  return datos.numeroServicio.length === 12 || datos.consumosHistoricos.length > 0;
}

/**
 * Analiza el texto de un recibo CFE (una cadena por página).
 *
 * El texto de todas las páginas se junta y se busca por patrones; así da igual
 * que el titular esté en la página 1 y el histórico en la 2, o que el OCR haya
 * leído la misma página con dos recortes distintos.
 */
export function analizarReciboCfe(paginas: string[]): ResultadoAnalisisRecibo {
  const texto = paginas.join('\n');
  const advertencias: string[] = [];

  const numeroServicio = extraerNumeroServicio(texto, advertencias);
  const tarifa = extraerTarifa(texto, advertencias);
  const hilos = extraerHilos(texto, advertencias);
  const domicilio = extraerTitularYDomicilio(texto, advertencias);
  const consumosHistoricos = extraerHistorico(texto, advertencias);

  const periodo = detectarPeriodo(consumosHistoricos);
  if (consumosHistoricos.length > 0 && periodo === null) {
    advertencias.push('No se pudo deducir si el recibo es bimestral o mensual.');
  }

  const nombreProyecto = [domicilio.nombreCliente, domicilio.localidad].filter(Boolean).join(' - ');

  const datos: ReciboCfeParseado = {
    nombreCliente: domicilio.nombreCliente,
    nombreProyecto,
    contacto: separarNombreTitular(domicilio.nombreCliente),
    numeroServicio,
    tarifa,
    hilos,
    localidad: domicilio.localidad,
    municipio: domicilio.municipio,
    estado: domicilio.estado,
    codigoPostal: domicilio.codigoPostal,
    numeroMedidor: extraerNumeroMedidor(texto),
    direccion: [domicilio.calle, domicilio.municipio || domicilio.localidad, domicilio.estado]
      .filter(Boolean)
      .join(', '),
    periodoFacturado: extraerPeriodoFacturado(texto),
    periodo,
    fechaInicio: consumosHistoricos[0]?.inicio ?? '',
    consumosHistoricos,
  };

  return { datos, advertencias };
}
