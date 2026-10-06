import { Contacto } from './types';

/** Nombre completo para mostrar en tabla y formularios. */
export function nombreCompleto(c: Contacto): string {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ').trim();
}

/** Ubicación compuesta a partir de localidad/estado, con respaldo si falta alguno. */
export function ubicacionContacto(c: Contacto): string {
  if (c.localidad && c.estado) return `${c.localidad}, ${c.estado}`;
  return c.localidad || c.estado || 'Sin especificar';
}

/** Formatea una fecha ISO del backend al formato corto usado en el resto de la app. */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-MX');
}
