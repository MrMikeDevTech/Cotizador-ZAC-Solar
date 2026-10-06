'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ListChecks } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { formatoFechaCorta } from './utilidades';
import type { EstadoRecurso, TareaPendiente } from './tipos';

interface TarjetaTareasProps {
  estado: EstadoRecurso<TareaPendiente[]>;
  className?: string;
}

/**
 * Tareas pendientes reales (`/api/tareas?completada=false`). Marcar una como
 * completada hace un PATCH real y la retira de la lista de inmediato, con un
 * toast de confirmación; si el PATCH falla, la tarea vuelve a aparecer.
 */
export function TarjetaTareas({ estado, className = '' }: TarjetaTareasProps) {
  // Tareas ya marcadas como completadas en esta sesión: se ocultan sin
  // esperar a que el padre vuelva a pedir toda la lista de tareas.
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());

  const marcarCompletada = async (tarea: TareaPendiente) => {
    setOcultas((previo) => new Set(previo).add(tarea.id));
    try {
      await api.patch(`/api/tareas/${tarea.id}`, { completada: true });
      toast.success(`Tarea "${tarea.titulo}" marcada como completada.`);
    } catch (error) {
      setOcultas((previo) => {
        const siguiente = new Set(previo);
        siguiente.delete(tarea.id);
        return siguiente;
      });
      toast.error(error instanceof ApiError ? error.message : 'No se pudo marcar la tarea.');
    }
  };

  return (
    <TarjetaBento
      titulo="Tareas pendientes"
      icono={ListChecks}
      enlace={{ href: '/crm/tareas', etiqueta: 'Ver todas' }}
      className={className}
    >
      <EnvolturaEstado
        estado={estado}
        vacio={(tareas) => tareas.filter((t) => !ocultas.has(t.id)).length === 0}
        mensajeVacio="No hay tareas pendientes."
        alturaEsqueleto="h-56"
        render={(tareas) => {
          const visibles = tareas.filter((t) => !ocultas.has(t.id));
          const ahora = Date.now();
          return (
            <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
              {visibles.map((tarea) => {
                const vencida = tarea.fechaVencimiento
                  ? new Date(tarea.fechaVencimiento).getTime() < ahora
                  : false;
                return (
                  <label
                    key={tarea.id}
                    className="flex items-start gap-3 text-sm border-b border-gray-100 pb-3 cursor-pointer last:border-0"
                  >
                    <input
                      type="checkbox"
                      onChange={() => marcarCompletada(tarea)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#00388d] focus:ring-[#00388d] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{tarea.titulo}</p>
                      <p className={`text-xs mt-0.5 ${vencida ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {tarea.fechaVencimiento ? formatoFechaCorta(tarea.fechaVencimiento) : 'Sin fecha'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        }}
      />
    </TarjetaBento>
  );
}
