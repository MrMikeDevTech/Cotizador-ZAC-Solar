import type { ItemActividad } from './tipos';

export function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatoFechaCorta(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export function formatoFechaHora(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export interface ActividadAgrupada {
  etiquetas: string[];
  proyectos: number[];
  contactos: number[];
}

/**
 * Agrupa items de `/api/reportes/actividad` por día de creación, para los
 * últimos `dias` días (incluyendo hoy). Solo cuenta `accion === 'creado'`:
 * las actualizaciones no representan altas nuevas y mezclarlas inflaría el
 * conteo de "actividad reciente" sin que corresponda a un alta real.
 */
export function agruparActividadPorDia(items: ItemActividad[], dias: number): ActividadAgrupada {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const claves: string[] = [];
  const etiquetas: string[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    claves.push(d.toISOString().slice(0, 10));
    etiquetas.push(d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
  }

  const proyectosPorDia = new Map<string, number>(claves.map((c) => [c, 0]));
  const contactosPorDia = new Map<string, number>(claves.map((c) => [c, 0]));

  for (const item of items) {
    if (item.accion !== 'creado') continue;
    const clave = item.fecha.slice(0, 10);
    if (item.tipo === 'proyecto' && proyectosPorDia.has(clave)) {
      proyectosPorDia.set(clave, (proyectosPorDia.get(clave) ?? 0) + 1);
    } else if (item.tipo === 'contacto' && contactosPorDia.has(clave)) {
      contactosPorDia.set(clave, (contactosPorDia.get(clave) ?? 0) + 1);
    }
  }

  return {
    etiquetas,
    proyectos: claves.map((c) => proyectosPorDia.get(c) ?? 0),
    contactos: claves.map((c) => contactosPorDia.get(c) ?? 0),
  };
}
