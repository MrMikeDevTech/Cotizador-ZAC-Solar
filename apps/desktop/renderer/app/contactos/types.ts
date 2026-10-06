// Forma del contacto tal como lo devuelve el backend (modelo Prisma `Contacto`).
// Sustituye al tipo anterior, que mezclaba campos derivados en memoria
// (`nombre` como nombre completo, `ubicacion`, `autor`) con los reales.
export interface Contacto {
  id: string;
  codigo: string;
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
  esEmpresa: boolean;
  rfc: string;
  cargo: string;
  razonSocial: string;
  actividadComercial: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ColumnaOrden = 'codigo' | 'nombre' | 'ubicacion' | 'estatus' | 'fecha';

export type DireccionOrden = 'asc' | 'desc';

// Forma que acepta `POST`/`PUT /api/contactos/:id` (ver
// `packages/shared/src/schemas/contacto.ts`). El formulario del modal solo
// edita los campos personales; los empresariales viajan con valores vacíos.
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
