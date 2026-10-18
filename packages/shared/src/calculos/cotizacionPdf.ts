import { calcularPorcentajeDescuento } from './cotizacion.ts';
import type {
  DatosCotizacionPdf,
  EmpresaPdf,
  LineaCotizacionPdf,
} from '../types/cotizacionPdf.ts';

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const TITULO_POR_DEFECTO = 'Cotización de sistema fotovoltaico';
const TELEFONO_POR_DEFECTO = '***';
const CLIENTE_POR_DEFECTO = 'A QUIEN CORRESPONDA';
const METODO_PAGO_POR_DEFECTO = 'Contado';

/**
 * Un concepto de la cotización tal como se guardó: sin el id de la plantilla
 * de origen (se pierde al persistir, ver `ProyectoCotizable`).
 */
interface ConceptoCotizacionPdf {
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
  orden: number;
}

interface CargoCotizacionPdf {
  nombre: string;
  monto: number;
  orden: number;
}

/**
 * Subconjunto de `Cotizacion` (vía Prisma, en `apps/backend`) que necesita
 * `construirCotizacionPdf`. Se define aquí, estructural, en vez de importar
 * el tipo de Prisma porque `packages/shared` no puede depender ni de Prisma
 * ni del renderer: cualquiera de los dos consumidores (API, desktop) puede
 * pasar su propio objeto siempre que tenga esta forma.
 */
export interface CotizacionCotizable {
  panelNombre: string;
  cantPaneles: number;
  inversorNombre: string;
  cantInversores: number;
  estructuraNombre: string;
  estructuraPrecio: number;
  tamanoSistemaW: number;
  produccionPeriodo: number;
  subtotalGeneral: number;
  montoDescuento: number;
  subtotalConDescuento: number;
  montoIva: number;
  granTotal: number;
  metodoPago: string;
  incluirIva: boolean;
  ocultarDesglose: boolean;
  descuento5: boolean;
  descuento10: boolean;
  conceptos: ConceptoCotizacionPdf[];
  cargos: CargoCotizacionPdf[];
}

/**
 * Subconjunto de `DatosContacto` (ver `types/dominio.ts`) + los dos campos
 * de empresa (`esEmpresa`, `razonSocial`) que en el modelo real de Prisma
 * viven en el mismo registro `Contacto`, no en el tipo de formulario del
 * wizard. Se repiten aquí en vez de importarlos porque el tipo del wizard no
 * los declara sueltos (van dentro de `empresariales`).
 */
export interface ContactoCotizable {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  celular: string;
  localidad: string;
  estado: string;
  esEmpresa: boolean;
  razonSocial: string;
}

/**
 * Subconjunto mínimo de `Proyecto` (vía Prisma) + su `contacto` y la
 * cotización vigente (`cotizaciones[0]`, siempre el array de una sola
 * versión que devuelve `GET /api/proyectos/:id`). No importa tipos de
 * Prisma ni del renderer: ver `CotizacionCotizable`.
 */
export interface ProyectoCotizable {
  nombre: string;
  localidadConsumo: string;
  contacto: ContactoCotizable;
  cotizaciones: [CotizacionCotizable, ...CotizacionCotizable[]] | CotizacionCotizable[];
}

export interface EntradaCotizacionPdf {
  proyecto: ProyectoCotizable;
  empresa: EmpresaPdf | null;
  /** Fecha de emisión. Se inyecta para que la función sea determinista y testeable. */
  fecha: Date;
  /**
   * Quién firma si Configuración no tiene un firmante fijo: normalmente el
   * usuario de la sesión, que es quien está cotizando.
   *
   * Sin esto, una empresa recién configurada entregaba cotizaciones **sin
   * línea de firma**, que es justo el hueco donde el cliente espera un
   * nombre. El firmante de Configuración sigue teniendo prioridad: sirve
   * para cuando siempre firma el mismo responsable comercial.
   */
  firmantePorDefecto?: { nombre: string; puesto?: string };
}

/** Redondea a 2 decimales evitando el ruido binario de coma flotante (p. ej. 0.1 + 0.2). */
function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Compara un texto sin distinguir mayúsculas ni acentos, para detectar
 * "Panel" / "panel" / "PANEL" por igual aunque venga con tilde.
 */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Resuelve cantidad y descripción de una línea de concepto.
 *
 * Heurístico y necesario: los `ConceptoCotizacion` capturados en el wizard
 * vienen de una plantilla ("Precio de paneles", "Precio de inversores"…),
 * pero al guardarse en BD se les asigna un id nuevo (uuid) que no conserva
 * ninguna relación con esa plantilla ni con el equipo elegido. La única
 * cantidad que sí sobrevive es el snapshot del equipo (`cantPaneles`,
 * `cantInversores`), así que se infiere la cantidad por el nombre del
 * concepto. Si el usuario lo renombra a algo que no contiene "panel" ni
 * "inversor", degrada a cantidad 1 sin romper el total — solo se pierde el
 * detalle de cantidad, no el dinero.
 */
function resolverConceptoLinea(
  concepto: ConceptoCotizacionPdf,
  cotizacion: CotizacionCotizable
): { descripcion: string; cantidad: number } {
  const nombreNormalizado = normalizar(concepto.concepto);

  if (nombreNormalizado.includes('panel') && cotizacion.cantPaneles > 0) {
    return {
      descripcion: `Panel marca **${cotizacion.panelNombre}**`,
      cantidad: cotizacion.cantPaneles,
    };
  }

  if (nombreNormalizado.includes('inversor') && cotizacion.cantInversores > 0) {
    return {
      descripcion: `Inversor marca **${cotizacion.inversorNombre}**`,
      cantidad: cotizacion.cantInversores,
    };
  }

  return { descripcion: concepto.concepto, cantidad: 1 };
}

/**
 * Hasta cuánto desvío se considera residuo de redondeo y se absorbe en
 * silencio. Un peso cubre de sobra el redondeo a centavos de una docena de
 * líneas; por encima de eso, el origen está mal y conviene que se vea.
 */
const TOLERANCIA_REDONDEO = 1;

/** Construye las líneas de la tabla cuando no se oculta el desglose. */
function construirLineasDesglosadas(cotizacion: CotizacionCotizable): LineaCotizacionPdf[] {
  const lineas: LineaCotizacionPdf[] = [];

  const conceptosOrdenados = [...cotizacion.conceptos].sort((a, b) => a.orden - b.orden);
  for (const concepto of conceptosOrdenados) {
    const { descripcion, cantidad } = resolverConceptoLinea(concepto, cotizacion);
    const importe = concepto.costoBase * (1 + concepto.margenPorcentaje / 100);
    lineas.push({ descripcion, cantidad, importe: redondear2(importe) });
  }

  if (cotizacion.estructuraPrecio > 0) {
    lineas.push({
      descripcion: cotizacion.estructuraNombre,
      cantidad: 1,
      importe: redondear2(cotizacion.estructuraPrecio),
    });
  }

  const cargosOrdenados = [...cotizacion.cargos].sort((a, b) => a.orden - b.orden);
  for (const cargo of cargosOrdenados) {
    if (cargo.monto > 0) {
      lineas.push({ descripcion: cargo.nombre, cantidad: 1, importe: redondear2(cargo.monto) });
    }
  }

  if (cotizacion.montoDescuento > 0) {
    const porcentaje = calcularPorcentajeDescuento(cotizacion.descuento5, cotizacion.descuento10);
    lineas.push({
      descripcion: `Descuento (${porcentaje}%)`,
      cantidad: 1,
      importe: redondear2(-cotizacion.montoDescuento),
    });
  }

  if (cotizacion.montoIva > 0) {
    lineas.push({ descripcion: 'IVA', cantidad: 1, importe: redondear2(cotizacion.montoIva) });
  }

  // El redondeo por línea puede dejar un desvío de centavos frente a
  // `granTotal` (p. ej. 57779.995 → 57780.00 repartido en varias líneas que
  // redondean cada una hacia abajo). Se corrige para que el invariante
  // "suma de líneas == total" se cumpla exactamente, nunca aproximadamente.
  const totalRedondeado = redondear2(cotizacion.granTotal);
  const sumaLineas = redondear2(lineas.reduce((acc, linea) => acc + linea.importe, 0));
  const diferencia = redondear2(totalRedondeado - sumaLineas);

  if (diferencia !== 0 && lineas.length > 0) {
    if (Math.abs(diferencia) <= TOLERANCIA_REDONDEO) {
      // Residuo de redondeo: se absorbe en la última línea sin que se note.
      const ultima = lineas[lineas.length - 1]!;
      lineas[lineas.length - 1] = { ...ultima, importe: redondear2(ultima.importe + diferencia) };
    } else {
      // Desvío grande: los datos de origen son incoherentes (p. ej. un
      // `granTotal` que no corresponde a los conceptos guardados). Absorberlo
      // en la última línea la dejaría sin sentido —se llegó a ver un "IVA:
      // −275.20"— así que se emite como línea propia: el documento sigue
      // cuadrando y la anomalía queda a la vista en vez de disfrazada.
      lineas.push({ descripcion: 'Ajuste', cantidad: 1, importe: diferencia });
    }
  }

  return lineas;
}

/** Formatea una fecha en es-MX con mes en palabra: "28/Agosto/2026". */
function formatearFecha(fecha: Date): string {
  const dia = fecha.getDate();
  const mes = MESES_ES[fecha.getMonth()];
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Nombre del cliente a imprimir. Las empresas se identifican por razón
 * social, no por el nombre de la persona de contacto; si no hay nada
 * capturado, se usa la fórmula estándar de facturación genérica en vez de
 * dejar el campo vacío.
 */
function resolverCliente(contacto: ContactoCotizable): string {
  if (contacto.esEmpresa && contacto.razonSocial.trim() !== '') {
    return contacto.razonSocial.trim();
  }

  const nombreCompleto = [contacto.nombre, contacto.apellidoPaterno, contacto.apellidoMaterno]
    .map((parte) => parte.trim())
    .filter(Boolean)
    .join(' ');

  return nombreCompleto !== '' ? nombreCompleto : CLIENTE_POR_DEFECTO;
}

function resolverUbicacion(proyecto: ProyectoCotizable): string {
  if (proyecto.localidadConsumo.trim() !== '') {
    return proyecto.localidadConsumo.trim();
  }

  const { localidad, estado } = proyecto.contacto;
  if (localidad.trim() !== '' || estado.trim() !== '') {
    return [localidad.trim(), estado.trim()].filter(Boolean).join(', ');
  }

  return '';
}

function resolverTelefono(contacto: ContactoCotizable): string {
  if (contacto.telefono.trim() !== '') return contacto.telefono.trim();
  if (contacto.celular.trim() !== '') return contacto.celular.trim();
  return TELEFONO_POR_DEFECTO;
}

/** Sustituye los placeholders `{kwp}` y `{kwh}` de la plantilla de intro de la empresa. */
function resolverIntro(empresa: EmpresaPdf | null, cotizacion: CotizacionCotizable): string {
  const kwp = (cotizacion.tamanoSistemaW / 1000).toFixed(2);
  const kwh = Math.round(cotizacion.produccionPeriodo).toString();

  const plantilla = empresa?.introPlantilla.trim();
  if (plantilla) {
    return plantilla.replace(/\{kwp\}/g, kwp).replace(/\{kwh\}/g, kwh);
  }

  return (
    'En atención a su interés en adquirir un sistema de generación solar, y derivado del ' +
    'estudio técnico realizado con base en su historial de consumo, ponemos a su disposición ' +
    'la presente cotización para el suministro e instalación de un sistema fotovoltaico ' +
    `interconectado a la red de CFE de ${kwp} kWp, con una producción estimada de ${kwh} kWh ` +
    'por periodo. El equipo propuesto es nuevo, cuenta con la garantía de sus fabricantes, y ' +
    'la instalación se entrega en operación e incluye la gestión del contrato de ' +
    'interconexión ante CFE.'
  );
}

function resolverObservaciones(empresa: EmpresaPdf | null): string[] {
  if (!empresa) return [];
  return empresa.observaciones
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);
}

/**
 * Traduce el proyecto + cotización vigente + datos de empresa al documento
 * plano que consume la plantilla de impresión (`DatosCotizacionPdf`).
 *
 * Es una función pura: no hace I/O ni usa `Date.now()` (la fecha de emisión
 * se recibe por parámetro) para poder probarla sin depender del reloj ni de
 * la base de datos.
 */
export function construirCotizacionPdf(entrada: EntradaCotizacionPdf): DatosCotizacionPdf {
  const { proyecto, empresa, fecha } = entrada;
  const cotizacion = proyecto.cotizaciones[0];
  if (!cotizacion) {
    throw new Error('El proyecto no tiene una cotización vigente (cotizaciones[0] vacío).');
  }

  const lineas: LineaCotizacionPdf[] = cotizacion.ocultarDesglose
    ? [
        {
          descripcion: empresa?.tituloCotizacion.trim() || TITULO_POR_DEFECTO,
          cantidad: 1,
          importe: redondear2(cotizacion.granTotal),
        },
      ]
    : construirLineasDesglosadas(cotizacion);

  return {
    titulo: empresa?.tituloCotizacion.trim() || TITULO_POR_DEFECTO,
    fecha: formatearFecha(fecha),
    cliente: resolverCliente(proyecto.contacto),
    ubicacion: resolverUbicacion(proyecto),
    telefono: resolverTelefono(proyecto.contacto),
    metodoPago: cotizacion.metodoPago.trim() || METODO_PAGO_POR_DEFECTO,
    intro: resolverIntro(empresa, cotizacion),
    lineas,
    total: redondear2(cotizacion.granTotal),
    observaciones: resolverObservaciones(empresa),
    firmaNombre: empresa?.firmaNombre.trim() || entrada.firmantePorDefecto?.nombre.trim() || '',
    firmaPuesto: empresa?.firmaPuesto.trim() || entrada.firmantePorDefecto?.puesto?.trim() || '',
    mostrarLogo: empresa !== null,
  };
}
