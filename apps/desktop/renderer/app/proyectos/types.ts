// Formas devueltas por `GET /api/proyectos` (incluye `contacto` y `fase` hidratados).
// Sustituyen al tipo plano anterior que traía campos inventados (`autor`, `etapa`
// como texto libre) que no existen en el modelo real.

export interface FaseFunnel {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  color: string;
  esSistema: boolean;
  totalProyectos?: number;
}

export interface ContactoResumen {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export interface Proyecto {
  id: string;
  codigo: string;
  contactoId: string;
  contacto: ContactoResumen;
  nombre: string;
  localidadConsumo: string;
  tarifa: string;
  faseId: string;
  fase: FaseFunnel;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
