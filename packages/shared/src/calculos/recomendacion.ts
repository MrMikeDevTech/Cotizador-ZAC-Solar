import type { PanelData, InversorData, FactoresCalculo } from '../types/configuracion.ts';
import { calcularDimensionamiento } from './dimensionamiento.ts';

/**
 * Recomendación automática de paquetes (Paso 3): dado el catálogo activo y el
 * consumo del cliente, arma hasta 3 tarjetas ("Económico", "Equilibrado",
 * "Máximo ahorro") sin que el vendedor tenga que probar combinaciones a mano.
 *
 * ## Por qué "Equilibrado" es la rodilla de Pareto y no un cociente ahorro/inversión
 *
 * En `calcularDimensionamiento` el ahorro es exactamente lineal en la
 * cobertura (mientras no se llegue al 100%: `ahorro = pagoPromedioCFE -
 * nuevoPago`, y `nuevoPago` es una interpolación lineal de `autoconsumo`).
 * Eso significa que, dentro de una misma combinación panel+inversor, el
 * cociente `ahorro / inversión` crece monótonamente con el número de
 * paneles: su máximo SIEMPRE cae en la cobertura más alta posible. Si
 * "Equilibrado" se definiera maximizando ese cociente, colapsaría siempre
 * en el mismo candidato que "Máximo ahorro" — nunca encontraría un punto
 * intermedio real.
 *
 * Por eso aquí se usa la rodilla de la frontera de Pareto (máxima distancia
 * perpendicular al segmento que une el candidato más barato con el de mayor
 * ahorro): es invariante a esa linealidad y solo reacciona a quiebres reales
 * de la curva — p. ej. un salto de precio al necesitar un inversor extra.
 * Si la curva es perfectamente lineal (todos los puntos de la frontera son
 * colineales), la rodilla empata con el extremo de mayor ahorro y el
 * resultado colapsa con "Máximo ahorro" (ver `PERFILES_COLAPSADOS`); eso es
 * esperado, no un bug.
 *
 * ## Dónde viven las advertencias
 *
 * No está especificado explícitamente qué advertencias van en el nivel
 * global (`ResultadoRecomendacion.advertencias`) y cuáles en el paquete
 * (`PaqueteRecomendado.advertencias`). Decisión tomada aquí: todo lo que
 * describe el estado del cálculo completo (catálogo vacío, cobertura no
 * alcanzable, perfiles colapsados, etc.) va global; `INVERSOR_SOBREDIMENSIONADO`
 * va solo en el paquete afectado (no todos los paquetes lo tienen);
 * `SIN_PAGO_CAPTURADO` va en ambos lados porque describe tanto el estado
 * global como el motivo puntual del clamping en cada paquete.
 */

export type PerfilPaquete = 'economico' | 'equilibrado' | 'maximoAhorro';

export type CodigoAdvertencia =
  | 'SIN_PANELES'
  | 'SIN_INVERSORES'
  | 'SIN_CONSUMO'
  | 'SIN_PAGO_CAPTURADO'
  | 'SIN_INVERSOR_VIABLE'
  /**
   * Ni un solo panel del catálogo cabe bajo el tope de cobertura: el más
   * pequeño ya produciría más de lo que consume el cliente. Tiene su propio
   * código porque la causa y la salida son opuestas a `SIN_INVERSOR_VIABLE`
   * — aquí el problema es que el consumo es demasiado bajo, no que falte
   * capacidad de inversor, y decir lo segundo mandaría a revisar el catálogo
   * equivocado.
   */
  | 'CONSUMO_MENOR_QUE_UN_PANEL'
  | 'FACTORES_INVALIDOS'
  | 'INVERSOR_SOBREDIMENSIONADO'
  | 'COBERTURA_MAXIMA_NO_ALCANZABLE'
  | 'COBERTURA_BAJO_MINIMO'
  | 'ARREGLO_TRUNCADO'
  | 'PERFILES_COLAPSADOS';

export interface LimitesRecomendacion {
  /**
   * Cobertura máxima que puede alcanzar un paquete, en porcentaje del consumo.
   *
   * Pasa del 100 % a propósito. La cantidad de paneles se redondea hacia
   * abajo, así que con un tope exacto de 100 el arreglo siempre se quedaba
   * *por debajo* —p. ej. 5 paneles cubriendo el 95.7 %— y "Máximo ahorro"
   * nunca llegaba a cubrir el consumo entero, que es justo lo que promete.
   *
   * El margen no es gratis: en medición neta el excedente anual no consumido
   * se pierde al cierre, así que la generación por encima del consumo no se
   * recupera. El 20 % por defecto es una decisión de negocio: da aire para la
   * degradación del panel (~0.5 %/año) y algo de crecimiento del consumo,
   * asumiendo que parte de ese excedente no se aprovechará.
   *
   * En la práctica solo "Máximo ahorro" llega aquí: "Económico" minimiza la
   * inversión y "Equilibrado" busca la rodilla de la curva, así que ninguno
   * de los dos se va al extremo salvo que los tres perfiles colapsen.
   */
  coberturaMaximaPct: number;
  coberturaMinimaPct: number;
  relacionCargaMinima: number;
  maxInversoresIguales: number;
  maxPanelesArreglo: number;
}

const LIMITES_DEFECTO: LimitesRecomendacion = {
  coberturaMaximaPct: 120,
  coberturaMinimaPct: 60,
  relacionCargaMinima: 0.6,
  maxInversoresIguales: 4,
  maxPanelesArreglo: 200,
};

export interface CostosRecomendacion {
  costoFijo: number;
  costoPorPanel: number;
}

const COSTOS_DEFECTO: CostosRecomendacion = {
  costoFijo: 0,
  costoPorPanel: 0,
};

export interface EntradaRecomendacion {
  paneles: PanelData[];
  inversores: InversorData[];
  /** Promedio POR PERIODO (bimestral), igual que `calcularPromedios`. */
  consumoPromedioKwh: number;
  pagoPromedioCFE: number;
  factores: Pick<FactoresCalculo, 'factorProduccion' | 'pagoMinimoCfe'>;
  costos?: Partial<CostosRecomendacion>;
  limites?: Partial<LimitesRecomendacion>;
}

export interface PaqueteRecomendado {
  perfiles: PerfilPaquete[];
  panel: PanelData;
  cantPaneles: number;
  inversor: InversorData;
  cantInversores: number;
  tamanoSistema: number;
  produccion: number;
  coberturaPct: number;
  nuevoPago: number;
  ahorroPorPeriodo: number;
  ahorroAnual: number;
  inversionEstimada: number;
  relacionCargaInversor: number;
  retornoAnios: number | null;
  advertencias: CodigoAdvertencia[];
}

export interface ResultadoRecomendacion {
  paquetes: PaqueteRecomendado[];
  candidatosEvaluados: number;
  advertencias: CodigoAdvertencia[];
}

/** La convención de `calcularPromedios`: divide el consumo/pago capturado entre 6 bimestres. */
const PERIODOS_POR_ANO = 6;

/** Candidato interno: una combinación panel+cantidad+inversor+cantidad ya resuelta y medida. */
interface Candidato {
  panel: PanelData;
  cantPaneles: number;
  inversor: InversorData;
  cantInversores: number;
  tamanoSistema: number;
  produccion: number;
  coberturaPct: number;
  nuevoPago: number;
  ahorroPorPeriodo: number;
  ahorroAnual: number;
  inversionEstimada: number;
  relacionCargaInversor: number;
  retornoAnios: number | null;
  sobredimensionado: boolean;
}

function resultadoVacio(codigo: CodigoAdvertencia, candidatosEvaluados = 0): ResultadoRecomendacion {
  return { paquetes: [], candidatosEvaluados, advertencias: [codigo] };
}

function esPanelValido(panel: PanelData): boolean {
  return panel.activo && panel.watts > 0 && panel.factorBifacial > 0;
}

function esInversorValido(inversor: InversorData): boolean {
  return inversor.activo && inversor.wattsMax > 0 && inversor.precioUnitario >= 0;
}

interface AsignacionInversor {
  inversor: InversorData;
  cantInversores: number;
  relacionCargaInversor: number;
  sobredimensionado: boolean;
}

/**
 * Paso 2 del algoritmo: elige el inversor (y cantidad de unidades iguales)
 * más barato que cubra `wattsDc` sin mezclar modelos. Si ninguna combinación
 * cumple la relación de carga mínima pero alguna cumple capacidad, devuelve
 * la de menor `wattsMax` marcada como sobredimensionada. Si ninguna cumple
 * ni capacidad, devuelve `null` (se descarta ese candidato panel+n).
 */
function elegirInversor(
  inversores: InversorData[],
  wattsDc: number,
  limites: LimitesRecomendacion
): AsignacionInversor | null {
  let mejorViable: { inversor: InversorData; k: number; costoTotal: number; capacidadTotal: number } | null = null;
  let mejorSoloCapacidad: { inversor: InversorData; k: number; costoTotal: number; capacidadTotal: number } | null =
    null;

  for (const inversor of inversores) {
    for (let k = 1; k <= limites.maxInversoresIguales; k++) {
      const capacidadTotal = k * inversor.wattsMax;
      if (wattsDc > capacidadTotal) continue;

      const cumpleCargaMinima = wattsDc >= limites.relacionCargaMinima * capacidadTotal;
      const costoTotal = k * inversor.precioUnitario;

      if (cumpleCargaMinima) {
        if (
          !mejorViable ||
          costoTotal < mejorViable.costoTotal ||
          (costoTotal === mejorViable.costoTotal &&
            (k < mejorViable.k ||
              (k === mejorViable.k &&
                (inversor.wattsMax < mejorViable.inversor.wattsMax ||
                  (inversor.wattsMax === mejorViable.inversor.wattsMax &&
                    inversor.clave.localeCompare(mejorViable.inversor.clave) < 0)))))
        ) {
          mejorViable = { inversor, k, costoTotal, capacidadTotal };
        }
      } else {
        if (
          !mejorSoloCapacidad ||
          inversor.wattsMax < mejorSoloCapacidad.inversor.wattsMax ||
          (inversor.wattsMax === mejorSoloCapacidad.inversor.wattsMax &&
            (k < mejorSoloCapacidad.k ||
              (k === mejorSoloCapacidad.k &&
                (costoTotal < mejorSoloCapacidad.costoTotal ||
                  (costoTotal === mejorSoloCapacidad.costoTotal &&
                    inversor.clave.localeCompare(mejorSoloCapacidad.inversor.clave) < 0)))))
        ) {
          mejorSoloCapacidad = { inversor, k, costoTotal, capacidadTotal };
        }
      }
    }
  }

  const elegido = mejorViable ?? mejorSoloCapacidad;
  if (!elegido) return null;

  return {
    inversor: elegido.inversor,
    cantInversores: elegido.k,
    relacionCargaInversor: wattsDc / elegido.capacidadTotal,
    sobredimensionado: elegido === mejorSoloCapacidad,
  };
}

/** Selecciona el mejor elemento de un arreglo no vacío según un comparador (negativo = `a` mejor que `b`). */
function seleccionarMejor<T>(candidatos: T[], comparador: (a: T, b: T) => number): T {
  return candidatos.reduce((mejor, actual) => (comparador(actual, mejor) < 0 ? actual : mejor));
}

function compararPorOrdenYClave(a: Candidato, b: Candidato): number {
  if (a.panel.orden !== b.panel.orden) return a.panel.orden - b.panel.orden;
  const porClavePanel = a.panel.clave.localeCompare(b.panel.clave);
  if (porClavePanel !== 0) return porClavePanel;
  return a.inversor.clave.localeCompare(b.inversor.clave);
}

/** Perfil "Económico": mínima inversión. */
function compararEconomico(a: Candidato, b: Candidato): number {
  if (a.inversionEstimada !== b.inversionEstimada) return a.inversionEstimada - b.inversionEstimada;
  if (a.coberturaPct !== b.coberturaPct) return b.coberturaPct - a.coberturaPct;
  if (a.ahorroPorPeriodo !== b.ahorroPorPeriodo) return b.ahorroPorPeriodo - a.ahorroPorPeriodo;
  if (a.cantPaneles !== b.cantPaneles) return a.cantPaneles - b.cantPaneles;
  if (a.cantInversores !== b.cantInversores) return a.cantInversores - b.cantInversores;
  return compararPorOrdenYClave(a, b);
}

/** Perfil "Máximo ahorro": máxima cobertura. */
function compararMaximoAhorro(a: Candidato, b: Candidato): number {
  if (a.coberturaPct !== b.coberturaPct) return b.coberturaPct - a.coberturaPct;
  if (a.inversionEstimada !== b.inversionEstimada) return a.inversionEstimada - b.inversionEstimada;
  if (a.cantPaneles !== b.cantPaneles) return a.cantPaneles - b.cantPaneles;
  if (a.cantInversores !== b.cantInversores) return a.cantInversores - b.cantInversores;
  return compararPorOrdenYClave(a, b);
}

/** `a` domina a `b` si es igual o mejor en ambos ejes (inversión y ahorro) y estrictamente mejor en al menos uno. */
function domina(a: Candidato, b: Candidato): boolean {
  const igualOMejorInversion = a.inversionEstimada <= b.inversionEstimada;
  const igualOMejorAhorro = a.ahorroAnual >= b.ahorroAnual;
  const estrictoEnAlgo = a.inversionEstimada < b.inversionEstimada || a.ahorroAnual > b.ahorroAnual;
  return igualOMejorInversion && igualOMejorAhorro && estrictoEnAlgo;
}

const EPSILON_SCORE = 1e-7;

/** Perfil "Equilibrado": rodilla de la frontera de Pareto (inversión↓, ahorroAnual↑). Ver JSDoc del archivo. */
function seleccionarEquilibrado(pool: Candidato[]): Candidato {
  const frontera = pool.filter((candidato) => !pool.some((otro) => otro !== candidato && domina(otro, candidato)));

  const extremoBarato = seleccionarMejor(frontera, (a, b) => a.inversionEstimada - b.inversionEstimada);
  const extremoAhorro = seleccionarMejor(frontera, (a, b) => b.ahorroAnual - a.ahorroAnual);

  const rangoInversion = extremoAhorro.inversionEstimada - extremoBarato.inversionEstimada;
  const rangoAhorro = extremoAhorro.ahorroAnual - extremoBarato.ahorroAnual;

  let mejor: Candidato | null = null;
  let mejorScore = -Infinity;

  for (const candidato of frontera) {
    const inversionNorm =
      rangoInversion > EPSILON_SCORE ? (candidato.inversionEstimada - extremoBarato.inversionEstimada) / rangoInversion : 0;
    const ahorroNorm =
      rangoAhorro > EPSILON_SCORE ? (candidato.ahorroAnual - extremoBarato.ahorroAnual) / rangoAhorro : 0;
    const score = ahorroNorm - inversionNorm;

    if (
      mejor === null ||
      score > mejorScore + EPSILON_SCORE ||
      (Math.abs(score - mejorScore) <= EPSILON_SCORE &&
        (candidato.coberturaPct > mejor.coberturaPct ||
          (candidato.coberturaPct === mejor.coberturaPct &&
            (candidato.inversionEstimada < mejor.inversionEstimada ||
              (candidato.inversionEstimada === mejor.inversionEstimada && compararPorOrdenYClave(candidato, mejor) < 0)))))
    ) {
      mejor = candidato;
      mejorScore = score;
    }
  }

  // frontera siempre tiene al menos un elemento cuando pool no está vacío.
  return mejor as Candidato;
}

/** Clave de deduplicación: dos perfiles que caen en la misma combinación se funden en un solo paquete. */
function claveCombinacion(candidato: Candidato): string {
  return `${candidato.panel.clave}|${candidato.cantPaneles}|${candidato.inversor.clave}|${candidato.cantInversores}`;
}

function construirPaquete(
  candidato: Candidato,
  perfiles: PerfilPaquete[],
  sinPagoCapturado: boolean
): PaqueteRecomendado {
  const advertencias: CodigoAdvertencia[] = [];
  if (candidato.sobredimensionado) advertencias.push('INVERSOR_SOBREDIMENSIONADO');
  if (sinPagoCapturado) advertencias.push('SIN_PAGO_CAPTURADO');

  return {
    perfiles,
    panel: candidato.panel,
    cantPaneles: candidato.cantPaneles,
    inversor: candidato.inversor,
    cantInversores: candidato.cantInversores,
    tamanoSistema: candidato.tamanoSistema,
    produccion: candidato.produccion,
    coberturaPct: candidato.coberturaPct,
    nuevoPago: candidato.nuevoPago,
    ahorroPorPeriodo: candidato.ahorroPorPeriodo,
    ahorroAnual: candidato.ahorroAnual,
    inversionEstimada: candidato.inversionEstimada,
    relacionCargaInversor: candidato.relacionCargaInversor,
    retornoAnios: candidato.retornoAnios,
    advertencias,
  };
}

/** Recomendación automática de hasta 3 paquetes (económico / equilibrado / máximo ahorro) para el Paso 3. */
export function recomendarPaquetes(entrada: EntradaRecomendacion): ResultadoRecomendacion {
  const limites: LimitesRecomendacion = { ...LIMITES_DEFECTO, ...entrada.limites };
  const costos: CostosRecomendacion = { ...COSTOS_DEFECTO, ...entrada.costos };

  const panelesValidos = entrada.paneles.filter(esPanelValido);
  const inversoresValidos = entrada.inversores.filter(esInversorValido);

  if (panelesValidos.length === 0) return resultadoVacio('SIN_PANELES');
  if (inversoresValidos.length === 0) return resultadoVacio('SIN_INVERSORES');
  // `calcularPromedios` devuelve 1 (sumaKwh/6 || 1) como centinela cuando no hay
  // captura de consumo; por eso el piso es <= 1 y no <= 0.
  if (entrada.consumoPromedioKwh <= 1) return resultadoVacio('SIN_CONSUMO');
  if (entrada.factores.factorProduccion <= 0) return resultadoVacio('FACTORES_INVALIDOS');

  const sinPagoCapturado = entrada.pagoPromedioCFE === 0;

  let candidatosEvaluados = 0;
  let huboTruncamiento = false;
  let huboIntentoDeAsignacion = false;
  const candidatos: Candidato[] = [];

  for (const panel of panelesValidos) {
    const prodPanel = panel.watts * panel.factorBifacial * entrada.factores.factorProduccion;
    if (prodPanel <= 0) continue;

    let nMax = Math.floor((entrada.consumoPromedioKwh * (limites.coberturaMaximaPct / 100)) / prodPanel);
    if (nMax > limites.maxPanelesArreglo) {
      nMax = limites.maxPanelesArreglo;
      huboTruncamiento = true;
    }
    if (nMax < 1) continue;

    for (let n = 1; n <= nMax; n++) {
      candidatosEvaluados++;
      huboIntentoDeAsignacion = true;

      const wattsDc = n * panel.watts * panel.factorBifacial;
      const asignacion = elegirInversor(inversoresValidos, wattsDc, limites);
      if (!asignacion) continue;

      const dimension = calcularDimensionamiento({
        panel,
        cantPaneles: n,
        consumoPromedioKwh: entrada.consumoPromedioKwh,
        pagoPromedioCFE: entrada.pagoPromedioCFE,
        factores: entrada.factores,
      });

      const ahorroPorPeriodo = sinPagoCapturado ? Math.max(0, dimension.ahorro) : dimension.ahorro;
      const ahorroAnual = ahorroPorPeriodo * PERIODOS_POR_ANO;
      const inversionEstimada =
        n * panel.precioUnitario + asignacion.cantInversores * asignacion.inversor.precioUnitario + costos.costoFijo + n * costos.costoPorPanel;

      candidatos.push({
        panel,
        cantPaneles: n,
        inversor: asignacion.inversor,
        cantInversores: asignacion.cantInversores,
        tamanoSistema: dimension.tamanoSistema,
        produccion: dimension.produccion,
        coberturaPct: dimension.autoconsumo,
        nuevoPago: dimension.nuevoPago,
        ahorroPorPeriodo,
        ahorroAnual,
        inversionEstimada,
        relacionCargaInversor: asignacion.relacionCargaInversor,
        retornoAnios: sinPagoCapturado ? null : ahorroAnual > 0 ? inversionEstimada / ahorroAnual : null,
        sobredimensionado: asignacion.sobredimensionado,
      });
    }
  }

  if (candidatos.length === 0) {
    // Dos causas muy distintas acaban aquí, y conviene no confundirlas: si
    // nunca se llegó a buscar inversor es que ningún panel cabía bajo el tope
    // (consumo demasiado bajo); si se buscó y no hubo ninguno, el catálogo de
    // inversores se queda corto. La UI manda al usuario a sitios opuestos
    // según el caso.
    return resultadoVacio(
      huboIntentoDeAsignacion ? 'SIN_INVERSOR_VIABLE' : 'CONSUMO_MENOR_QUE_UN_PANEL',
      candidatosEvaluados
    );
  }

  const advertenciasGlobales = new Set<CodigoAdvertencia>();
  if (huboTruncamiento) advertenciasGlobales.add('ARREGLO_TRUNCADO');
  if (sinPagoCapturado) advertenciasGlobales.add('SIN_PAGO_CAPTURADO');

  // El aviso es "no se puede cubrir el consumo", así que se mide contra el
  // 100 % y no contra `coberturaMaximaPct`. Comparar con el tope hacía que
  // saltara casi siempre —un arreglo al 114.8 % con tope 115 lo disparaba—,
  // avisando de algo falso justo cuando el consumo sí queda cubierto.
  const maxCoberturaAlcanzada = seleccionarMejor(candidatos, compararMaximoAhorro).coberturaPct;
  const coberturaObjetivo = Math.min(100, limites.coberturaMaximaPct);
  if (maxCoberturaAlcanzada < coberturaObjetivo - EPSILON_SCORE) {
    advertenciasGlobales.add('COBERTURA_MAXIMA_NO_ALCANZABLE');
  }

  const sobreMinimo = candidatos.filter((c) => c.coberturaPct >= limites.coberturaMinimaPct);

  let paquetes: PaqueteRecomendado[];

  if (sobreMinimo.length === 0) {
    // Fallback: ningún candidato alcanza el piso de cobertura. Se ignora el
    // piso y se devuelve el mejor candidato existente (mayor cobertura)
    // colapsado en un solo paquete con los 3 perfiles, en vez de lista vacía.
    advertenciasGlobales.add('COBERTURA_BAJO_MINIMO');
    advertenciasGlobales.add('PERFILES_COLAPSADOS');
    const mejor = seleccionarMejor(candidatos, compararMaximoAhorro);
    paquetes = [construirPaquete(mejor, ['economico', 'equilibrado', 'maximoAhorro'], sinPagoCapturado)];
  } else {
    const economico = seleccionarMejor(sobreMinimo, compararEconomico);
    const maximoAhorro = seleccionarMejor(sobreMinimo, compararMaximoAhorro);
    const equilibrado = seleccionarEquilibrado(sobreMinimo);

    const seleccionados: Array<{ perfil: PerfilPaquete; candidato: Candidato }> = [
      { perfil: 'economico', candidato: economico },
      { perfil: 'maximoAhorro', candidato: maximoAhorro },
      { perfil: 'equilibrado', candidato: equilibrado },
    ];

    const porClave = new Map<string, { candidato: Candidato; perfiles: PerfilPaquete[] }>();
    for (const { perfil, candidato } of seleccionados) {
      const clave = claveCombinacion(candidato);
      const existente = porClave.get(clave);
      if (existente) {
        existente.perfiles.push(perfil);
      } else {
        porClave.set(clave, { candidato, perfiles: [perfil] });
      }
    }

    paquetes = Array.from(porClave.values()).map(({ candidato, perfiles }) =>
      construirPaquete(candidato, perfiles, sinPagoCapturado)
    );

    if (paquetes.length < 3) advertenciasGlobales.add('PERFILES_COLAPSADOS');
  }

  return {
    paquetes,
    candidatosEvaluados,
    advertencias: Array.from(advertenciasGlobales),
  };
}
