export interface Contacto {
  id: string;
  codigo: string;
  nombre: string;
  nombreOriginal?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  estado?: string;
  localidad?: string;
  fuenteContacto?: string;
  ubicacion: string;
  estatus: string;
  fecha: string;
  notas: string;
  autor: string;
}

export type ColumnaOrden = 'codigo' | 'nombre' | 'ubicacion' | 'estatus' | 'fecha' | 'autor';

export type DireccionOrden = 'asc' | 'desc';

export interface ContactoFormData {
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
}
