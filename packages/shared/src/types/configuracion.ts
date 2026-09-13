export interface PanelData {
  clave: string;
  nombre: string;
  watts: number;
  factorBifacial: number;
  precioUnitario: number;
  activo: boolean;
  orden: number;
}

export interface InversorData {
  clave: string;
  nombre: string;
  wattsMax: number;
  precioUnitario: number;
  activo: boolean;
  orden: number;
}

export interface EstructuraInstalacion {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  orden: number;
}

export interface ConceptoPlantilla {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
  orden: number;
  activo: boolean;
}

export interface TarifaCfe {
  codigo: string;
  limiteDac: number | null;
  esNueva: boolean;
}

export interface LocalidadData {
  estado: string;
  nombre: string;
  factorProduccion: number;
  horasSol: number;
}

export interface DatosEmpresa {
  nombre: string;
  telefono: string;
  localidad: string;
  email: string;
  descripcion: string;
  rfc?: string;
  logoPath?: string | null;
}

export interface FactoresCalculo {
  factorProduccion: number;
  pagoMinimoCfe: number;
  ivaPorcentaje: number;
  inflacionCfe: number;
  factorCo2: number;
  factorArboles: number;
  factorKmAuto: number;
  areaPorPanel: number;
  factoresEstacionales: number[];
  precioPanelDefault: number;
  precioInversorDefault: number;
}

export interface ConfiguracionCompleta {
  empresa: DatosEmpresa;
  factores: FactoresCalculo;
  paneles: PanelData[];
  inversores: InversorData[];
  estructuras: EstructuraInstalacion[];
  conceptos: ConceptoPlantilla[];
  tarifas: TarifaCfe[];
  localidades: LocalidadData[];
}
