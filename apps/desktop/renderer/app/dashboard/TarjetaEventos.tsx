'use client';

import { CalendarClock, CircleDot, ClipboardList, FolderKanban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icono } from '../components/Icono';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { formatoFechaHora } from './utilidades';
import type { EstadoRecurso, ItemAgenda } from './tipos';

interface TarjetaEventosProps {
  estado: EstadoRecurso<ItemAgenda[]>;
  className?: string;
}

const MAX_VISIBLES = 5;

const ICONOS_TIPO: Record<ItemAgenda['tipo'], LucideIcon> = {
  evento: CalendarClock,
  tarea: ClipboardList,
  proyecto: FolderKanban,
};

/**
 * Próximos 30 días de la agenda unificada (`/api/agenda`): eventos, tareas
 * con vencimiento y proyectos creados, todo en una sola lista ordenada.
 */
export function TarjetaEventos({ estado, className = '' }: TarjetaEventosProps) {
  return (
    <TarjetaBento
      titulo="Próximos eventos"
      icono={CalendarClock}
      enlace={{ href: '/crm/calendario', etiqueta: 'Ver calendario' }}
      className={className}
    >
      <EnvolturaEstado
        estado={estado}
        vacio={(items) => items.length === 0}
        mensajeVacio="Sin eventos en los próximos 30 días."
        alturaEsqueleto="h-48"
        render={(items) => {
          const proximos = [...items].sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, MAX_VISIBLES);
          return (
            <ul className="space-y-3 overflow-y-auto max-h-64 pr-1">
              {proximos.map((item) => (
                <li
                  key={`${item.tipo}-${item.id}`}
                  className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2 last:border-0"
                >
                  <Icono icon={ICONOS_TIPO[item.tipo] ?? CircleDot} size={16} className="text-[#00388d] mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{item.titulo}</p>
                    <p className="text-xs text-gray-400">{formatoFechaHora(item.inicio)}</p>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      />
    </TarjetaBento>
  );
}
