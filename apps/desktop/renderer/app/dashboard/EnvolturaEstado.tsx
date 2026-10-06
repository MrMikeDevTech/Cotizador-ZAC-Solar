'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Icono } from '../components/Icono';
import type { EstadoRecurso } from './tipos';

interface EnvolturaEstadoProps<T> {
  estado: EstadoRecurso<T>;
  /** Decide si, con datos ya cargados, igual corresponde un estado vacío (p. ej. todo en cero). */
  vacio?: (datos: T) => boolean;
  mensajeVacio?: string;
  render: (datos: T) => ReactNode;
  alturaEsqueleto?: string;
}

/**
 * Centraliza los tres estados que puede tener el cuerpo de una tarjeta del
 * dashboard: cargando (esqueleto), error (el mensaje real de la petición) o
 * listo. Si "listo" resulta vacío o en ceros, se muestra un estado vacío
 * legible en vez de una gráfica o lista que finja tener datos — ese es
 * justo el bug que este rediseño corrige.
 */
export function EnvolturaEstado<T>({
  estado,
  vacio,
  mensajeVacio = 'Sin datos por ahora.',
  render,
  alturaEsqueleto = 'h-40',
}: EnvolturaEstadoProps<T>) {
  if (estado.estado === 'cargando') {
    return (
      <div className={`animate-pulse space-y-3 ${alturaEsqueleto}`} role="status" aria-label="Cargando">
        <div className="h-4 bg-gray-200/70 rounded w-3/4" />
        <div className="h-4 bg-gray-200/70 rounded w-full" />
        <div className="h-4 bg-gray-200/70 rounded w-5/6" />
        <div className="h-4 bg-gray-200/70 rounded w-2/3" />
      </div>
    );
  }

  if (estado.estado === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-6 text-red-500 flex-1">
        <Icono icon={AlertTriangle} size={22} />
        <p className="text-xs font-medium">{estado.mensaje}</p>
      </div>
    );
  }

  if (vacio?.(estado.datos)) {
    return (
      <div className="flex items-center justify-center py-6 flex-1">
        <p className="text-xs text-gray-400 italic text-center">{mensajeVacio}</p>
      </div>
    );
  }

  return <>{render(estado.datos)}</>;
}
