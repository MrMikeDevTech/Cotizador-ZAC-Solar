'use client';

import type { ReactNode } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Icono } from './Icono';

export type DireccionOrdenTabla = 'asc' | 'desc';

export interface OrdenTabla {
  clave: string;
  direccion: DireccionOrdenTabla;
}

export interface ColumnaTabla<T> {
  /** Identificador de la columna. Si coincide con una propiedad de `T` se usa como valor por defecto. */
  clave: string;
  encabezado: string;
  /** Si se omite, se intenta leer `fila[clave]` directamente. */
  render?: (fila: T) => ReactNode;
  ordenable?: boolean;
  /** Ancho mínimo CSS, p. ej. "120px", para evitar columnas demasiado angostas al hacer scroll horizontal. */
  anchoMin?: string;
}

interface DataTableProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (fila: T) => string | number;
  orden?: OrdenTabla | null;
  onOrdenar?: (clave: string) => void;
  vacio?: ReactNode;
}

function obtenerValorCelda<T>(fila: T, clave: string): ReactNode {
  const valor = (fila as Record<string, unknown>)[clave];
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' || typeof valor === 'number') return valor;
  return String(valor);
}

/**
 * Tabla genérica con ordenamiento opcional. Reemplaza los indicadores de
 * texto (`↕ ▲ ▼`) por iconos de lucide-react y mantiene el scroll horizontal
 * contenido dentro de la tabla en vez de empujar el body completo.
 */
export function DataTable<T>({
  columnas,
  filas,
  claveFila,
  orden,
  onOrdenar,
  vacio = 'No se encontraron registros.',
}: DataTableProps<T>) {
  const renderIconoOrden = (columna: ColumnaTabla<T>) => {
    if (!columna.ordenable) return null;
    if (orden?.clave !== columna.clave) {
      return (
        <span className="text-gray-300 ml-1 inline-flex">
          <Icono icon={ChevronsUpDown} size={14} />
        </span>
      );
    }
    return (
      <span className="text-[#00388d] ml-1 inline-flex">
        <Icono icon={orden.direccion === 'asc' ? ChevronUp : ChevronDown} size={14} />
      </span>
    );
  };

  return (
    <div className="overflow-x-auto pt-2">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 font-bold select-none">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                style={columna.anchoMin ? { minWidth: columna.anchoMin } : undefined}
                onClick={columna.ordenable ? () => onOrdenar?.(columna.clave) : undefined}
                className={`py-3 px-3 whitespace-nowrap ${
                  columna.ordenable ? 'cursor-pointer hover:text-[#00388d] transition-colors' : ''
                }`}
              >
                <span className="inline-flex items-center">
                  {columna.encabezado}
                  {renderIconoOrden(columna)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {filas.length > 0 ? (
            filas.map((fila, indice) => (
              <tr key={claveFila(fila)} className={indice % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                {columnas.map((columna) => (
                  <td key={columna.clave} className="py-3.5 px-3">
                    {columna.render ? columna.render(fila) : obtenerValorCelda(fila, columna.clave)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnas.length} className="py-8 text-center text-gray-400">
                {vacio}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
