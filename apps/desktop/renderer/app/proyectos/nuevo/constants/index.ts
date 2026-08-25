import { PanelData, InversorData, PasoWizard, EstructuraInstalacion, ConceptoCotizacion } from '../types';

export const PASOS_PROYECTO: PasoWizard[] = [
  { num: 1, label: 'Contacto' },
  { num: 2, label: 'Consumo' },
  { num: 3, label: 'Equipo' },
  { num: 4, label: 'Otros cargos' },
  { num: 5, label: 'Confirmación' },
];

export const estadosMexico: string[] = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

export const localidadesPorEstado: Record<string, string[]> = {
  'Nayarit': ['Tepic', 'Xalisco', 'Compostela', 'Bahía de Banderas', 'Acaponeta'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Puerto Vallarta'],
};

export const fuentesContacto: string[] = [
  'Recomendación', 'Búsqueda Web', 'Formato de solicitud web', 'Llamada', 'Correo electrónico', 'Visita al local', 'Facebook', 'Publicidad', 'Campaña', 'Prospectación', 'Expo', 'Volantes', 'Conocido'
];

export const estatusContacto: string[] = [
  'Primer contacto', 'Solicitud de recibo', 'Contactar en el futuro', 'No responde', 'No aplica', 'No interesado', 'Contrato con otra empresa', 'Cotización entregada', 'Proyecto aceptado'
];

export const tarifasClasicas: string[] = ['1A', '1', '1B', '1C', '1D', '1E', '1F', 'DAC'];
export const tarifasNuevas: string[] = ['PDBT', 'APBT'];
export const opcionesHilos: string[] = ['1 hilo', '2 hilos', '3 hilos', 'X'];

export const limitesDACTarifas: Record<string, number | null> = {
  '1': 500,
  '1A': 600,
  '1B': 800,
  '1C': 1600,
  '1D': 2000,
  '1E': 4000,
  '1F': 5000,
  'DAC': null,
  'PDBT': null,
  'APBT': null,
};

export const panelesData: Record<string, PanelData> = {
  'canadian_620_base': { nombre: 'Canadian Solar, CS6.2-66TB-620- sin % add.', watts: 620, factorBifacial: 1.0 },
  'canadian_620_bi10': { nombre: 'Canadian Solar, CS6.2-66TB-620- Bifacial al 10%.', watts: 620, factorBifacial: 1.10 },
  'canadian_620_bi20': { nombre: 'Canadian Solar, CS6.2-66TB-620- Bifacial al 20%.', watts: 620, factorBifacial: 1.20 },
  'jinko_615': { nombre: 'Jinko, JKM615N-78HL4-V.', watts: 615, factorBifacial: 1.0 },
  'jinko_620': { nombre: 'Jinko, 620W-66HL4M-BDV- sin % add.', watts: 620, factorBifacial: 1.0 },
  'trina_620': { nombre: 'TRINA, 620-TSM-NEG19RC.20- sin %add.', watts: 620, factorBifacial: 1.0 },
};

export const inversoresData: Record<string, InversorData> = {
  'growatt_10k_2020': { nombre: 'Growatt, MIN 10000 TL-X/2020', wattsMax: 14000 },
  'growatt_2500': { nombre: 'Growatt, MIN 2500TL - X2', wattsMax: 3500 },
  'growatt_3000': { nombre: 'Growatt, MIN 3000TL - X2', wattsMax: 4200 },
  'growatt_3600': { nombre: 'Growatt, MIN 3600TL - X2', wattsMax: 4900 }, 
  'growatt_4200': { nombre: 'Growatt, MIN 4200TL - X2', wattsMax: 5800 },
  'growatt_4600': { nombre: 'Growatt, MIN 4600TL - X2', wattsMax: 6400 },
  'growatt_5000': { nombre: 'Growatt, MIN 5000TL - X2', wattsMax: 7000 },
  'growatt_6000': { nombre: 'Growatt, MIN 6000TL - X2', wattsMax: 8400 },
  'growatt_7000': { nombre: 'Growatt, MIN 7000TL - X2', wattsMax: 9800 },
  'growatt_8000': { nombre: 'Growatt, MIN 8000TL - X2', wattsMax: 11200 },
  'growatt_9000': { nombre: 'Growatt, MIN 9000TL - X2', wattsMax: 12600 },
  'growatt_10k_x2': { nombre: 'Growatt, MIN 10000TL - X2', wattsMax: 14000 },
  'growatt_mic_3300': { nombre: 'Growatt, MIC 3300TL - X2', wattsMax: 4600 },
  'growatt_neo_2500m': { nombre: 'Growatt, NEO 2500M - X2', wattsMax: 3500 },
};

export const PAGO_MINIMO_CFE = 60;

// --- CATÁLOGOS PASO 4: OTROS CARGOS ---
export const LISTA_ESTRUCTURAS: EstructuraInstalacion[] = [
  { id: 'teja', nombre: 'Teja', precio: 10800 },
  { id: 'contrapeso', nombre: 'Techo c/contra peso', precio: 7200 },
  { id: 'perforacion', nombre: 'Techo c/perforación', precio: 9000 },
  { id: 'asbesto', nombre: 'Lamina Asbesto', precio: 9000 },
  { id: 'angulo', nombre: 'Estructura Angulo aluminio', precio: 3600 },
  { id: 'ptr', nombre: 'Estructura PTR Galvanizado', precio: 3600 },
];

export const CONCEPTOS_COTIZACION_DEFECTO: ConceptoCotizacion[] = [
  { id: '1', concepto: 'Precio de paneles', costoBase: 13200, margenPorcentaje: 0 },
  { id: '2', concepto: 'Precio de inversores', costoBase: 21871.98, margenPorcentaje: 0 },
  { id: '3', concepto: 'Precio material eléctrico', costoBase: 3480, margenPorcentaje: 0 },
  { id: '4', concepto: 'Mano de obra', costoBase: 3600, margenPorcentaje: 0 },
];

