import { ColumnaConfig, TarjetaFunnel, TipoColumna } from './types';

export const MAPA_ESTATUS: Record<TipoColumna, string> = {
  'Lead': 'En desarrollo',
  'Gestión Comercial': 'Enviado',
  'Arranque': 'Vendido',
};

export const COLUMNAS: ColumnaConfig[] = [
  { clave: 'Lead', titulo: 'Lead' },
  { clave: 'Gestión Comercial', titulo: 'Gestión Comercial' },
  { clave: 'Arranque', titulo: 'Arranque' },
];

export const tarjetasIniciales: TarjetaFunnel[] = [
  {
    id: '1',
    estatus: 'En desarrollo',
    cliente: 'Rosalva Espinoza López',
    proyecto: 'Residencial Espinoza',
    autor: 'Miguel Angel Martinez',
    tarifa: '1B',
    ultimoPaso: 'Paso 4',
    costoEstimado: 45000,
    columna: 'Lead',
  },
  {
    id: '2',
    estatus: 'En desarrollo',
    cliente: 'América Judith Romero',
    proyecto: 'Comercial Romero',
    autor: 'Miguel Angel Martinez',
    tarifa: '1B',
    ultimoPaso: 'Paso 5',
    costoEstimado: 78000,
    columna: 'Lead',
  },
  {
    id: '3',
    estatus: 'Enviado',
    cliente: 'Gerardo Núñez Cuevas',
    proyecto: 'Proyecto Núñez',
    autor: 'Miguel Angel Martinez',
    tarifa: 'PDBT',
    ultimoPaso: 'Paso 5',
    costoEstimado: 120000,
    columna: 'Gestión Comercial',
  },
  {
    id: '4',
    estatus: 'Enviado',
    cliente: 'Sr. J. Manuel',
    proyecto: 'Bodega J. Manuel',
    autor: 'Miguel Angel Martinez',
    tarifa: 'GDBT',
    ultimoPaso: 'Paso 5',
    costoEstimado: 95000,
    columna: 'Gestión Comercial',
  },
  {
    id: '5',
    estatus: 'Vendido',
    cliente: 'Marcia Chávez Nungaray',
    proyecto: 'Sistema Solar 10kW',
    autor: 'Miguel Angel Martinez',
    tarifa: 'PDBT',
    ultimoPaso: 'Paso 5',
    costoEstimado: 150000,
    columna: 'Arranque',
  },
  {
    id: '6',
    estatus: 'Vendido',
    cliente: 'Antonio Rojas',
    proyecto: 'Instalación Industrial',
    autor: 'Miguel Angel Martinez',
    tarifa: '1B',
    ultimoPaso: 'Paso 5',
    costoEstimado: 210000,
    columna: 'Arranque',
  },
];
