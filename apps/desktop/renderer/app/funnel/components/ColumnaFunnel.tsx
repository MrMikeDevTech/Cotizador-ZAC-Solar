'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Icono } from '../../components/Icono';
import { FaseFunnel, ProyectoFunnel } from '../types';
import { TarjetaFunnelCard } from './TarjetaFunnelCard';
import { ColumnaVacia } from './ColumnaVacia';

interface ColumnaFunnelProps {
  fase: FaseFunnel;
  proyectos: ProyectoFunnel[];
  onRenombrar: (fase: FaseFunnel) => void;
  onBorrar: (fase: FaseFunnel) => void;
}

/**
 * Columna del tablero (una fase). El encabezado completo es el asa de
 * arrastre para reordenar columnas; el área de tarjetas es un `SortableContext`
 * vertical independiente y además un `droppable` propio (`area-<id>`) para
 * poder soltar una tarjeta sobre una columna vacía o bajo la última tarjeta.
 */
export function ColumnaFunnel({ fase, proyectos, onRenombrar, onBorrar }: ColumnaFunnelProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setNodeRefColumna,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fase.id, data: { type: 'columna' } });

  const { setNodeRef: setNodeRefArea } = useDroppable({
    id: `area-${fase.id}`,
    data: { type: 'columna-area', faseId: fase.id },
  });

  const estiloColumna = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRefColumna}
      style={estiloColumna}
      className={`w-[85vw] max-w-[320px] sm:w-[300px] shrink-0 bg-gray-50 rounded-3xl p-3 border border-gray-200 flex flex-col min-h-[180px] max-h-[75vh] transition-opacity ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* ENCABEZADO DE COLUMNA (asa de arrastre para reordenar fases) */}
      <div
        {...attributes}
        {...listeners}
        className="bg-[#00388d] text-white px-3 py-3 rounded-2xl mb-3 flex items-center gap-2 shadow-md cursor-grab active:cursor-grabbing touch-none"
      >
        <Icono icon={GripVertical} size={16} className="text-white/60 shrink-0" />

        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fase.color }} aria-hidden="true" />

        <h2 className="font-bold text-sm tracking-wide truncate flex-1">{fase.nombre}</h2>

        <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
          {proyectos.length}
        </span>

        {!fase.esSistema && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRenombrar(fase)}
              aria-label="Renombrar fase"
              className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <Icono icon={Pencil} size={14} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onBorrar(fase)}
              aria-label="Borrar fase"
              className="text-white/70 hover:text-[#ef4444] p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <Icono icon={Trash2} size={14} />
            </button>
          </div>
        )}
      </div>

      {/* AREA DE TARJETAS */}
      <div ref={setNodeRefArea} className="space-y-3 flex-1 overflow-y-auto pr-1">
        <SortableContext items={proyectos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {proyectos.length > 0 ? (
            proyectos.map((proyecto) => (
              <TarjetaFunnelCard key={proyecto.id} proyecto={proyecto} color={fase.color} faseId={fase.id} />
            ))
          ) : (
            <ColumnaVacia />
          )}
        </SortableContext>
      </div>
    </div>
  );
}
