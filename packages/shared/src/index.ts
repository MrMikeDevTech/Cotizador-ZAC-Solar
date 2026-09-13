export type {
  ConsumoPeriodo,
  DatosEmpresariales,
  DatosContacto,
  MetodoPrecio,
  TipoMoneda,
  EstatusProyecto,
  CargoEditable,
  ConceptoCotizacion,
  FilaRetornoInversion,
  PasoWizard,
} from './types/dominio.ts';

export type {
  PanelData,
  InversorData,
  EstructuraInstalacion,
  ConceptoPlantilla,
  TarifaCfe,
  LocalidadData,
  DatosEmpresa,
  FactoresCalculo,
  ConfiguracionCompleta,
} from './types/configuracion.ts';

export type {
  EquipoSeleccionado,
  OtrosCargosPayload,
  DatosProyectoPayload,
  GuardarProyectoPayload,
  ApiError,
} from './types/api.ts';

export { generarCodigoAbreviado, formatearMoneda } from './calculos/formato.ts';
export { calcularPromedios, calcularDimensionamiento } from './calculos/dimensionamiento.ts';
export type { Promedios, EntradaDimensionamiento, ResultadoDimensionamiento } from './calculos/dimensionamiento.ts';
export { calcularTotalesCotizacion, convertirMoneda } from './calculos/cotizacion.ts';
export type { EntradaTotalesCotizacion, ResultadoTotalesCotizacion } from './calculos/cotizacion.ts';
export { calcularProduccionEstacional, calcularDetalleRetornoInversion } from './calculos/bancoSolar.ts';
export { calcularBeneficiosAmbientales } from './calculos/ambiental.ts';
export type { BeneficiosAmbientales } from './calculos/ambiental.ts';
export { calcularProyeccion5Anos, calcularROI, calcularTIR5Anos } from './calculos/financiero.ts';
export type { Proyeccion5Anos } from './calculos/financiero.ts';

export * from './seed/catalogosIniciales.ts';

export * from './schemas/contacto.ts';
export * from './schemas/proyecto.ts';
export * from './schemas/configuracion.ts';
