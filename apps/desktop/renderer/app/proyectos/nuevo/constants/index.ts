import { PANELES_INICIALES, INVERSORES_INICIALES } from '@cotizador/shared';
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

/**
 * Catálogo de respaldo, usado solo mientras `/api/config` no ha respondido.
 *
 * Se deriva de la misma semilla que siembra la base de datos
 * (`PANELES_INICIALES` / `INVERSORES_INICIALES` de `@cotizador/shared`) en vez
 * de repetir los literales: antes eran dos listas copiadas a mano que podían
 * divergir en silencio, y la del wizard además había perdido `precioUnitario`.
 */
export const panelesData: Record<string, PanelData> = Object.fromEntries(
  PANELES_INICIALES.map((p) => [p.clave, p])
);

export const inversoresData: Record<string, InversorData> = Object.fromEntries(
  INVERSORES_INICIALES.map((inv) => [inv.clave, inv])
);

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


