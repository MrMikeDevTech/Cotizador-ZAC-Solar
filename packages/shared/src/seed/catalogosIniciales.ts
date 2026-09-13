import type {
  PanelData,
  InversorData,
  EstructuraInstalacion,
  ConceptoPlantilla,
  TarifaCfe,
  LocalidadData,
  DatosEmpresa,
  FactoresCalculo,
} from '../types/configuracion.ts';

/** Valores por defecto — port literal de nuevo/constants/index.ts. Usado por el seed de la DB y como fallback del front si el backend no responde. */

export const PASOS_PROYECTO = [
  { num: 1, label: 'Contacto' },
  { num: 2, label: 'Consumo' },
  { num: 3, label: 'Equipo' },
  { num: 4, label: 'Otros cargos' },
  { num: 5, label: 'Confirmación' },
];

export const estadosMexico: string[] = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export const localidadesPorEstado: Record<string, string[]> = {
  'Nayarit': ['Tepic', 'Xalisco', 'Compostela', 'Bahía de Banderas', 'Acaponeta'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Puerto Vallarta'],
};

export const fuentesContacto: string[] = [
  'Recomendación', 'Búsqueda Web', 'Formato de solicitud web', 'Llamada', 'Correo electrónico', 'Visita al local', 'Facebook', 'Publicidad', 'Campaña', 'Prospectación', 'Expo', 'Volantes', 'Conocido',
];

export const estatusContacto: string[] = [
  'Primer contacto', 'Solicitud de recibo', 'Contactar en el futuro', 'No responde', 'No aplica', 'No interesado', 'Contrato con otra empresa', 'Cotización entregada', 'Proyecto aceptado',
];

export const tarifasClasicas: string[] = ['1A', '1', '1B', '1C', '1D', '1E', '1F', 'DAC'];
export const tarifasNuevas: string[] = ['PDBT', 'APBT'];
export const opcionesHilos: string[] = ['1 hilo', '2 hilos', '3 hilos', 'X'];

export const TARIFAS_INICIALES: TarifaCfe[] = [
  { codigo: '1', limiteDac: 500, esNueva: false },
  { codigo: '1A', limiteDac: 600, esNueva: false },
  { codigo: '1B', limiteDac: 800, esNueva: false },
  { codigo: '1C', limiteDac: 1600, esNueva: false },
  { codigo: '1D', limiteDac: 2000, esNueva: false },
  { codigo: '1E', limiteDac: 4000, esNueva: false },
  { codigo: '1F', limiteDac: 5000, esNueva: false },
  { codigo: 'DAC', limiteDac: null, esNueva: false },
  { codigo: 'PDBT', limiteDac: null, esNueva: true },
  { codigo: 'APBT', limiteDac: null, esNueva: true },
];

export const LOCALIDADES_INICIALES: LocalidadData[] = [
  { estado: 'Nayarit', nombre: 'Tepic', factorProduccion: 0.24725, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Xalisco', factorProduccion: 0.24725, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Compostela', factorProduccion: 0.24725, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Bahía de Banderas', factorProduccion: 0.24725, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Acaponeta', factorProduccion: 0.24725, horasSol: 5.9 },
  { estado: 'Jalisco', nombre: 'Guadalajara', factorProduccion: 0.24725, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Zapopan', factorProduccion: 0.24725, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tlaquepaque', factorProduccion: 0.24725, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Puerto Vallarta', factorProduccion: 0.24725, horasSol: 5.8 },
];

export const PANELES_INICIALES: PanelData[] = [
  { clave: 'canadian_620_base', nombre: 'Canadian Solar, CS6.2-66TB-620- sin % add.', watts: 620, factorBifacial: 1.0, precioUnitario: 4400, activo: true, orden: 0 },
  { clave: 'canadian_620_bi10', nombre: 'Canadian Solar, CS6.2-66TB-620- Bifacial al 10%.', watts: 620, factorBifacial: 1.10, precioUnitario: 4400, activo: true, orden: 1 },
  { clave: 'canadian_620_bi20', nombre: 'Canadian Solar, CS6.2-66TB-620- Bifacial al 20%.', watts: 620, factorBifacial: 1.20, precioUnitario: 4400, activo: true, orden: 2 },
  { clave: 'jinko_615', nombre: 'Jinko, JKM615N-78HL4-V.', watts: 615, factorBifacial: 1.0, precioUnitario: 4400, activo: true, orden: 3 },
  { clave: 'jinko_620', nombre: 'Jinko, 620W-66HL4M-BDV- sin % add.', watts: 620, factorBifacial: 1.0, precioUnitario: 4400, activo: true, orden: 4 },
  { clave: 'trina_620', nombre: 'TRINA, 620-TSM-NEG19RC.20- sin %add.', watts: 620, factorBifacial: 1.0, precioUnitario: 4400, activo: true, orden: 5 },
];

export const INVERSORES_INICIALES: InversorData[] = [
  { clave: 'growatt_10k_2020', nombre: 'Growatt, MIN 10000 TL-X/2020', wattsMax: 14000, precioUnitario: 13500, activo: true, orden: 0 },
  { clave: 'growatt_2500', nombre: 'Growatt, MIN 2500TL - X2', wattsMax: 3500, precioUnitario: 13500, activo: true, orden: 1 },
  { clave: 'growatt_3000', nombre: 'Growatt, MIN 3000TL - X2', wattsMax: 4200, precioUnitario: 13500, activo: true, orden: 2 },
  { clave: 'growatt_3600', nombre: 'Growatt, MIN 3600TL - X2', wattsMax: 4900, precioUnitario: 13500, activo: true, orden: 3 },
  { clave: 'growatt_4200', nombre: 'Growatt, MIN 4200TL - X2', wattsMax: 5800, precioUnitario: 13500, activo: true, orden: 4 },
  { clave: 'growatt_4600', nombre: 'Growatt, MIN 4600TL - X2', wattsMax: 6400, precioUnitario: 13500, activo: true, orden: 5 },
  { clave: 'growatt_5000', nombre: 'Growatt, MIN 5000TL - X2', wattsMax: 7000, precioUnitario: 13500, activo: true, orden: 6 },
  { clave: 'growatt_6000', nombre: 'Growatt, MIN 6000TL - X2', wattsMax: 8400, precioUnitario: 13500, activo: true, orden: 7 },
  { clave: 'growatt_7000', nombre: 'Growatt, MIN 7000TL - X2', wattsMax: 9800, precioUnitario: 13500, activo: true, orden: 8 },
  { clave: 'growatt_8000', nombre: 'Growatt, MIN 8000TL - X2', wattsMax: 11200, precioUnitario: 13500, activo: true, orden: 9 },
  { clave: 'growatt_9000', nombre: 'Growatt, MIN 9000TL - X2', wattsMax: 12600, precioUnitario: 13500, activo: true, orden: 10 },
  { clave: 'growatt_10k_x2', nombre: 'Growatt, MIN 10000TL - X2', wattsMax: 14000, precioUnitario: 13500, activo: true, orden: 11 },
  { clave: 'growatt_mic_3300', nombre: 'Growatt, MIC 3300TL - X2', wattsMax: 4600, precioUnitario: 13500, activo: true, orden: 12 },
  { clave: 'growatt_neo_2500m', nombre: 'Growatt, NEO 2500M - X2', wattsMax: 3500, precioUnitario: 13500, activo: true, orden: 13 },
];

export const ESTRUCTURAS_INICIALES: EstructuraInstalacion[] = [
  { id: 'teja', nombre: 'Teja', precio: 10800, activo: true, orden: 0 },
  { id: 'contrapeso', nombre: 'Techo c/contra peso', precio: 7200, activo: true, orden: 1 },
  { id: 'perforacion', nombre: 'Techo c/perforación', precio: 9000, activo: true, orden: 2 },
  { id: 'asbesto', nombre: 'Lamina Asbesto', precio: 9000, activo: true, orden: 3 },
  { id: 'angulo', nombre: 'Estructura Angulo aluminio', precio: 3600, activo: true, orden: 4 },
  { id: 'ptr', nombre: 'Estructura PTR Galvanizado', precio: 3600, activo: true, orden: 5 },
];

export const CONCEPTOS_COTIZACION_DEFECTO: ConceptoPlantilla[] = [
  { id: '1', concepto: 'Precio de paneles', costoBase: 13200, margenPorcentaje: 0, orden: 0, activo: true },
  { id: '2', concepto: 'Precio de inversores', costoBase: 21871.98, margenPorcentaje: 0, orden: 1, activo: true },
  { id: '3', concepto: 'Precio material eléctrico', costoBase: 3480, margenPorcentaje: 0, orden: 2, activo: true },
  { id: '4', concepto: 'Mano de obra', costoBase: 3600, margenPorcentaje: 0, orden: 3, activo: true },
];

export const DATOS_EMPRESA_DEFECTO: DatosEmpresa = {
  nombre: 'Energy Sun',
  telefono: '322 123 4567',
  localidad: 'Puerto Vallarta, Jalisco',
  email: 'contacto@energysun.com',
  descripcion: 'Descripción de la empresa vendedora y detalles adicionales del distribuidor.',
};

export const PAGO_MINIMO_CFE = 60;

export const FACTORES_CALCULO_DEFECTO: FactoresCalculo = {
  factorProduccion: 0.24725,
  pagoMinimoCfe: 60,
  ivaPorcentaje: 16,
  inflacionCfe: 0.04,
  factorCo2: 0.505,
  factorArboles: 0.025,
  factorKmAuto: 3.785,
  areaPorPanel: 2.795,
  factoresEstacionales: [1.10, 0.97, 0.88, 1.00, 0.89, 1.10],
  precioPanelDefault: 4400,
  precioInversorDefault: 13500,
};
