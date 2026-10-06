/**
 * Tipos compartidos de los widgets del dashboard. Reflejan exactamente la
 * forma de las respuestas del backend (ver `apps/backend/src/routes/*.ts`):
 * ningún campo se inventa aquí para "completar" lo que la API no manda.
 */

export interface FaseResumen {
  faseId: string;
  slug: string;
  nombre: string;
  color: string;
  total: number;
}

export interface ResumenReporte {
  proyectosPorFase: FaseResumen[];
  contactosNuevosMes: number;
  cotizacionesEmitidas: number;
  montoTotalCotizado: number;
  montoTotalVendido: number;
}

export interface ItemActividad {
  id: string;
  tipo: 'proyecto' | 'contacto';
  accion: 'creado' | 'actualizado';
  titulo: string;
  fecha: string;
}

export interface ActividadReporte {
  datos: ItemActividad[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface TareaPendiente {
  id: string;
  titulo: string;
  descripcion: string;
  fechaVencimiento: string | null;
  completada: boolean;
}

export interface ContactoReciente {
  id: string;
  codigo: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  localidad: string;
  estado: string;
  estatus: string;
  createdAt: string;
}

export interface ItemAgenda {
  id: string;
  tipo: 'evento' | 'tarea' | 'proyecto';
  titulo: string;
  inicio: string;
  fin: string | null;
  proyectoId: string | null;
  contactoId: string | null;
  completada: boolean | null;
}

export interface PeriodoCfe {
  tariffCode: string;
  year: number;
  month: number;
  season: string;
  tierCount: number;
}

export interface EstadoCfeRates {
  lastFetchedAt: string | null;
  totalRows: number;
  periods: PeriodoCfe[];
}

/**
 * Estado de carga de un recurso remoto. Las tarjetas del dashboard renderizan
 * según esta unión en vez de inicializar con datos de relleno: mientras no
 * hay respuesta real, se muestra un esqueleto; si la petición falla, el
 * error real; nunca ceros ni listas vacías disfrazadas de datos.
 */
export type EstadoRecurso<T> =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; datos: T };
