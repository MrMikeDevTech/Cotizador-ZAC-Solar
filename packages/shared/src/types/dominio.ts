export interface ConsumoPeriodo {
  inicioStr: string;
  terminoStr: string;
  kwh: string;
  pago: string;
}

export interface DatosEmpresariales {
  rfc: string;
  cargo: string;
  razonSocial: string;
  actividadComercial: string;
}

export interface DatosContacto {
  contactoExistenteId?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  celular: string;
  email: string;
  estado: string;
  localidad: string;
  fuenteContacto: string;
  estatus: string;
  notas: string;
  mostrarEmpresariales: boolean;
  empresariales: DatosEmpresariales;
}

export type MetodoPrecio = 'unitario' | 'watt' | 'panel';
export type TipoMoneda = 'MXN' | 'USD';
export type EstatusProyecto = 'borrador' | 'cotizado' | 'enviado' | 'vendido' | 'perdido';

export interface CargoEditable {
  id: string;
  nombre: string;
  monto: number;
}

export interface ConceptoCotizacion {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
}

export interface FilaRetornoInversion {
  periodo: string;
  consumoHistorico: number;
  energiaGenerada: number;
  diferencia: number;
  nuevoConsumo: number;
  bancoSolar: number;
  nuevoPagoCFE: number;
  pagoHistorico: number;
  ahorroPeriodo: number;
}

export interface PasoWizard {
  num: number;
  label: string;
}
