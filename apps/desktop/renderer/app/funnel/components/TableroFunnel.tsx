'use client';

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, sortableKeyboardCoordinates, SortableContext } from '@dnd-kit/sortable';
import { ArrastreActivo, FaseFunnel, ProyectoFunnel } from '../types';
import { ColumnaFunnel } from './ColumnaFunnel';
import { TarjetaFunnelCard } from './TarjetaFunnelCard';

interface TableroFunnelProps {
  fases: FaseFunnel[];
  proyectosPorFase: Record<string, ProyectoFunnel[]>;
  arrastreActivo: ArrastreActivo | null;
  onRenombrarFase: (fase: FaseFunnel) => void;
  onBorrarFase: (fase: FaseFunnel) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}

/**
 * Tablero de columnas (fases) con scroll horizontal contenido. Un solo
 * `DndContext` maneja dos tipos de arrastre, distinguidos por
 * `active.data.current.type`: `columna` (reordena fases) y `tarjeta`
 * (mueve/reordena proyectos, dentro o entre columnas). La lógica de negocio
 * (optimismo + reversión + llamadas a la API) vive en la página; este
 * componente solo mecaniza dnd-kit y la presentación.
 */
export function TableroFunnel({
  fases,
  proyectosPorFase,
  arrastreActivo,
  onRenombrarFase,
  onBorrarFase,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: TableroFunnelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const faseActiva =
    arrastreActivo?.tipo === 'columna' ? fases.find((f) => f.id === arrastreActivo.id) ?? null : null;

  let proyectoActivo: ProyectoFunnel | null = null;
  let faseDeProyectoActivo: FaseFunnel | null = null;
  if (arrastreActivo?.tipo === 'tarjeta') {
    for (const fase of fases) {
      const encontrado = proyectosPorFase[fase.id]?.find((p) => p.id === arrastreActivo.id);
      if (encontrado) {
        proyectoActivo = encontrado;
        faseDeProyectoActivo = fase;
        break;
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="overflow-x-auto pb-3 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex gap-4 items-start min-h-[200px] w-fit">
          <SortableContext items={fases.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
            {fases.map((fase) => (
              <ColumnaFunnel
                key={fase.id}
                fase={fase}
                proyectos={proyectosPorFase[fase.id] ?? []}
                onRenombrar={onRenombrarFase}
                onBorrar={onBorrarFase}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {faseActiva ? (
          <div className="bg-[#00388d] text-white px-3 py-3 rounded-2xl shadow-2xl w-[260px] opacity-95 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: faseActiva.color }} />
            <span className="font-bold text-sm truncate">{faseActiva.nombre}</span>
          </div>
        ) : proyectoActivo && faseDeProyectoActivo ? (
          <div className="w-[260px] rotate-1 shadow-2xl rounded-2xl">
            <TarjetaFunnelCard
              proyecto={proyectoActivo}
              color={faseDeProyectoActivo.color}
              faseId={faseDeProyectoActivo.id}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
