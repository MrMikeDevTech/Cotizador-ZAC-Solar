import { ContactoFormData } from './types';

/** Tamaño de página para la paginación en cliente sobre el máx. de 50 registros que devuelve la API. */
export const REGISTROS_POR_PAGINA = 10;

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
