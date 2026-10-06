'use client';

import Link from 'next/link';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProyectoFunnel } from '../types';

interface TarjetaFunnelCardProps {
  proyecto: ProyectoFunnel;
  color: string;
  faseId: string;
}

const formateadorMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

function nombreContacto(proyecto: ProyectoFunnel): string {
  const { contacto } = proyecto;
  return [contacto.nombre, contacto.apellidoPaterno, contacto.apellidoMaterno]
    .filter((parte) => parte && parte.trim().length > 0)
    .join(' ');
}

/**
 * Tarjeta de proyecto del tablero de funnel. Es arrastrable (dnd-kit) tanto
 * dentro de su columna como entre columnas. El enlace "Ver" detiene la
 * propagación del puntero para que el drag no se active al hacer clic en él.
 */
export function TarjetaFunnelCard({ proyecto, color, faseId }: TarjetaFunnelCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: proyecto.id,
    data: { type: 'tarjeta', faseId },
  });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const detenerPropagacion = (evento: ReactPointerEvent<HTMLAnchorElement>) => {
    evento.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="w-1.5 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">{proyecto.codigo}</span>

          <h3 className="font-bold text-gray-800 text-sm leading-tight truncate">{proyecto.nombre}</h3>

          <p className="text-xs text-gray-500 truncate">{nombreContacto(proyecto)}</p>

          <p className="font-semibold text-gray-800 text-sm pt-1.5 border-t border-gray-100">
            {proyecto.granTotal != null ? formateadorMoneda.format(proyecto.granTotal) : 'Sin cotizar'}
          </p>

          <div className="pt-1 flex justify-end">
            <Link
              href={`/proyectos/nuevo?id=${proyecto.id}`}
              onPointerDown={detenerPropagacion}
              className="text-[#00388d] font-semibold hover:underline text-[11px]"
            >
              Ver
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
