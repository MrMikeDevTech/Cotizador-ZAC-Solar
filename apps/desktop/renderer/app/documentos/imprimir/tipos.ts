/**
 * Forma de lo que devuelve `GET /api/proyectos/:id`, que es exactamente lo
 * que recibe el documento al imprimirse.
 *
 * Existe para que al diseñar el PDF se vea qué datos hay disponibles sin
 * tener que leer el schema de Prisma ni adivinar: antes esta vista usaba
 * `any` por todas partes y cualquier campo mal escrito fallaba en silencio al
 * generar el documento, que es el peor momento para enterarse.
 *
 * Es un reflejo del backend, no un contrato propio: si `obtenerProyectoHidratado`
 * (apps/backend/src/servicios/proyectos.ts) empieza a devolver más campos,
 * se añaden aquí. Solo se declara lo que el documento puede necesitar.
 */

export interface ContactoImpreso {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  celular: string;
  email: string;
  estado: string;
  localidad: string;
  fuenteContacto: string;
  /** Las empresas se identifican por razón social, no por la persona de contacto. */
  esEmpresa: boolean;
  razonSocial: string;
}

export interface ConsumoImpreso {
  inicioStr: string;
  terminoStr: string;
  /** Numérico aquí, a diferencia del wizard, donde se captura como texto. */
  kwh: number;
  pago: number;
}

export interface ConceptoImpreso {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
  orden: number;
}

export interface CargoImpreso {
  id: string;
  nombre: string;
  monto: number;
  orden: number;
}

/**
 * Cotización congelada. Los campos de equipo son un **snapshot**: guardan
 * clave, nombre y watts tal como estaban al cotizar, para que el documento
 * siga siendo fiel aunque luego se edite o se borre ese panel del catálogo.
 */
export interface CotizacionImpresa {
  id: string;
  version: number;

  panelClave: string;
  panelNombre: string;
  panelWatts: number;
  cantPaneles: number;
  inversorClave: string;
  inversorNombre: string;
  inversorWattsMax: number;
  cantInversores: number;
  estructuraId: string | null;
  estructuraNombre: string;
  estructuraPrecio: number;

  tamanoSistemaW: number;
  produccionPeriodo: number;
  autoconsumoPct: number;
  nuevoPago: number;
  ahorroPeriodo: number;
  ahorroAnual: number;
  subtotalGeneral: number;
  montoDescuento: number;
  subtotalConDescuento: number;
  montoIva: number;
  granTotal: number;
  /** Retorno de inversión ya formateado por el motor (p. ej. "3.4 años"). */
  roiTexto: string;
  tirPorcentaje: number;

  // Equivalencias ambientales, útiles para un cierre comercial del documento.
  kgCo2: number;
  arboles: number;
  kmAuto: number;

  metodoPrecio: string;
  metodoPago: string;
  tipoMoneda: string;
  valorDolar: number;
  incluirIva: boolean;
  ocultarDesglose: boolean;
  descuento5: boolean;
  descuento10: boolean;

  conceptos: ConceptoImpreso[];
  cargos: CargoImpreso[];
}

export interface ProyectoImpreso {
  id: string;
  codigo: string;
  nombre: string;
  nombreRecibo: string;
  numeroServicio: string;
  tarifa: string;
  periodo: string;
  localidadConsumo: string;
  contacto: ContactoImpreso | null;
  consumos: ConsumoImpreso[];
  /** La vigente es la primera; el backend las ordena por versión descendente. */
  cotizaciones: CotizacionImpresa[];
}

/** Tipos de documento que sabe generar la vista de impresión. */
export type TipoDocumento = 'cotizacion' | 'contrato' | 'carta-poder';
