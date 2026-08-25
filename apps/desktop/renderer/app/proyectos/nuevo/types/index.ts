export interface ConsumoPeriodo {
  inicioStr: string;
  terminoStr: string;
  kwh: string;
  pago: string;
}

export interface PanelData {
  nombre: string;
  watts: number;
  factorBifacial: number;
}

export interface InversorData {
  nombre: string;
  wattsMax: number;
}

export interface PasoWizard {
  num: number;
  label: string;
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

// --- TIPOS PASO 4: OTROS CARGOS ---
export type MetodoPrecio = 'unitario' | 'watt' | 'panel';
export type TipoMoneda = 'MXN' | 'USD';

export interface EstructuraInstalacion {
  id: string;
  nombre: string;
  precio: number;
}

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

