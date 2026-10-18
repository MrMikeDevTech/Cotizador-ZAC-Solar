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

/**
 * Factor de producción común a toda la zona de cobertura.
 *
 * Es el mismo valor que ya tenían las localidades originales de Jalisco y
 * Nayarit: la irradiación del occidente de México varía poco entre estos
 * estados vecinos. **Es un punto de partida, no un dato medido por
 * municipio**; se ajusta por localidad desde Configuración → Utilidad, y es
 * lo que conviene hacer antes de cerrar ventas en una zona nueva, porque
 * este factor sí entra en el dimensionamiento.
 */
const FACTOR_PRODUCCION_REGIONAL = 0.24725;

/**
 * Municipios de la zona de cobertura: Jalisco y Nayarit más los estados
 * colindantes. `horasSol` es un promedio estatal aproximado, informativo —
 * no interviene en ningún cálculo, a diferencia de `factorProduccion`.
 */
export const LOCALIDADES_INICIALES: LocalidadData[] = [
  // --- Nayarit ---
  { estado: 'Nayarit', nombre: 'Tepic', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Xalisco', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Compostela', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Bahía de Banderas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Acaponeta', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Ahuacatlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Amatlán de Cañas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Huajicori', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Ixtlán del Río', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Jala', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Del Nayar', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Rosamorada', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Ruíz', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'San Blas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'San Pedro Lagunillas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Santa María del Oro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Santiago Ixcuintla', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Tecuala', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'Tuxpan', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Nayarit', nombre: 'La Yesca', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  // --- Jalisco ---
  { estado: 'Jalisco', nombre: 'Guadalajara', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Zapopan', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'San Pedro Tlaquepaque', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tonalá', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tlajomulco de Zúñiga', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'El Salto', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Puerto Vallarta', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Lagos de Moreno', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tepatitlán de Morelos', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Zapotlán el Grande', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Ocotlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Arandas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Autlán de Navarro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'La Barca', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Chapala', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Ameca', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tala', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Zacoalco de Torres', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Cihuatlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Mascota', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Talpa de Allende', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'San Juan de los Lagos', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Encarnación de Díaz', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Jalostotitlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Atotonilco el Alto', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tamazula de Gordiano', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Sayula', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Tuxpan', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Colotlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Jalisco', nombre: 'Ixtlahuacán del Río', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  // --- Colima ---
  { estado: 'Colima', nombre: 'Colima', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Villa de Álvarez', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Manzanillo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Tecomán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Armería', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Comala', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Coquimatlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Cuauhtémoc', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Ixtlahuacán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  { estado: 'Colima', nombre: 'Minatitlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.8 },
  // --- Aguascalientes ---
  { estado: 'Aguascalientes', nombre: 'Aguascalientes', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Jesús María', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Calvillo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Rincón de Romos', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Pabellón de Arteaga', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'San Francisco de los Romo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Asientos', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Tepezalá', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'Cosío', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'El Llano', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  { estado: 'Aguascalientes', nombre: 'San José de Gracia', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.0 },
  // --- Zacatecas ---
  { estado: 'Zacatecas', nombre: 'Zacatecas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Guadalupe', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Fresnillo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Jerez', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Sombrerete', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Río Grande', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Calera', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Loreto', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Ojocaliente', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Tlaltenango de Sánchez Román', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Juchipila', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Nochistlán de Mejía', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Valparaíso', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Villanueva', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Zacatecas', nombre: 'Pinos', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  // --- Guanajuato ---
  { estado: 'Guanajuato', nombre: 'León', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Irapuato', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Celaya', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Salamanca', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Guanajuato', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Silao de la Victoria', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'San Miguel de Allende', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Dolores Hidalgo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'San Francisco del Rincón', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Pénjamo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Valle de Santiago', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Acámbaro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Moroleón', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'Cortazar', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Guanajuato', nombre: 'San Luis de la Paz', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  // --- Michoacán ---
  { estado: 'Michoacán', nombre: 'Morelia', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Uruapan', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Zamora', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Lázaro Cárdenas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Apatzingán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Zitácuaro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'La Piedad', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Sahuayo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Pátzcuaro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Hidalgo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Jacona', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Los Reyes', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Zacapu', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Maravatío', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  { estado: 'Michoacán', nombre: 'Tacámbaro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.7 },
  // --- Sinaloa ---
  { estado: 'Sinaloa', nombre: 'Culiacán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Mazatlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Ahome', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Guasave', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Navolato', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'El Fuerte', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Salvador Alvarado', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Escuinapa', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Rosario', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'San Ignacio', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Mocorito', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Angostura', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Elota', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Concordia', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  { estado: 'Sinaloa', nombre: 'Badiraguato', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 5.9 },
  // --- Durango ---
  { estado: 'Durango', nombre: 'Durango', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Gómez Palacio', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Lerdo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Santiago Papasquiaro', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Pueblo Nuevo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Canatlán', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Nuevo Ideal', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Guadalupe Victoria', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Cuencamé', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Mapimí', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Tlahualilo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Vicente Guerrero', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Nombre de Dios', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Poanas', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
  { estado: 'Durango', nombre: 'Rodeo', factorProduccion: FACTOR_PRODUCCION_REGIONAL, horasSol: 6.1 },
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
