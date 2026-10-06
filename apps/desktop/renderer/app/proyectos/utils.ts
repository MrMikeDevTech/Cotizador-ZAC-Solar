import { ContactoResumen } from './types';

/** Nombre completo del contacto asociado al proyecto. */
export function nombreCompletoContacto(c: ContactoResumen): string {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ').trim();
}

/** Formatea una fecha ISO del backend al formato corto usado en el resto de la app. */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-MX');
}
