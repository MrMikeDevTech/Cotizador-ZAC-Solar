'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { Icono } from '../../components/Icono';

interface FunnelHeaderProps {
  cargando: boolean;
  onActualizar: () => void;
  onNuevaFase: () => void;
}

export function FunnelHeader({ cargando, onActualizar, onNuevaFase }: FunnelHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">Funnel de Ventas</h1>
        <p className="text-white/80 text-xs mt-1">
          Arrastra las tarjetas entre fases para actualizar su progreso.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          aria-label="Actualizar tablero"
          className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icono icon={RefreshCw} size={16} className={cargando ? 'animate-spin' : ''} />
        </button>
        <button
          type="button"
          onClick={onNuevaFase}
          className="flex items-center gap-2 bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-colors cursor-pointer"
        >
          <Icono icon={Plus} size={14} />
          Nueva fase
        </button>
      </div>
    </div>
  );
}
