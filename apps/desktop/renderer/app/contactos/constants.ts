import { Contacto, ContactoFormData } from './types';

export const REGISTROS_POR_PAGINA = 10;

export const contactosIniciales: Contacto[] = [
  {
    id: '1',
    codigo: 'ZAC-001',
    nombre: 'Cliente de Prueba 1',
    nombreOriginal: 'Cliente',
    apellidoPaterno: 'de Prueba 1',
    ubicacion: 'Zacatecas, Zacatecas',
    estado: 'Zacatecas',
    localidad: 'Zacatecas',
    estatus: 'Solicitud de recibo',
    fecha: '09/03/2026',
    notas: 'Requiere tarifa PDBT',
    autor: 'Octavio Angel Aguirre',
  },
  {
    id: '2',
    codigo: 'ZAC-002',
    nombre: 'Cliente de Prueba 2',
    nombreOriginal: 'Cliente',
    apellidoPaterno: 'de Prueba 2',
    ubicacion: 'Guadalupe, Zacatecas',
    estado: 'Zacatecas',
    localidad: 'Guadalupe',
    estatus: 'Primer contacto',
    fecha: '12/03/2026',
    notas: 'Interesado en sistema de 10kW',
    autor: 'Miguel Angel Martinez',
  },
];

export const FORM_INICIAL: ContactoFormData = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  telefono: '',
  celular: '',
  email: '',
  estado: '',
  localidad: '',
  fuenteContacto: '',
  estatus: '',
  notas: '',
};
