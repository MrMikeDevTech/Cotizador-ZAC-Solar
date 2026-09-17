'use client';

import { ColumnaConfig, TarjetaFunnel, TipoColumna } from '../types';
import { TarjetaFunnelCard } from './TarjetaFunnelCard';
import { ColumnaVacia } from './ColumnaVacia';

interface ColumnaFunnelProps {
  columna: ColumnaConfig;
  tarjetas: TarjetaFunnel[];
  tarjetaArrastradaId: string | null;
  estaSobre: boolean;
  onDragOver: (e: React.DragEvent, columna: TipoColumna) => void;
  onDragLeave: () => void;
  onDrop: (columna: TipoColumna) => void;
  onDragStart: (id: string) => void;
}

export function ColumnaFunnel({
  columna,
  tarjetas,
  tarjetaArrastradaId,
  estaSobre,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
}: ColumnaFunnelProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, columna.clave)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(columna.clave)}
      className={`bg-[#4a86e8]/20 backdrop-blur-sm rounded-3xl p-4 border transition-all duration-200 flex flex-col min-h-[520px] ${
        estaSobre
          ? 'border-white bg-[#4a86e8]/40 shadow-2xl scale-[1.01]'
          : 'border-white/20'
      }`}
    >
      {/* ENCABEZADO DE COLUMNA */}
      <div className="bg-[#00388d] text-white px-5 py-3 rounded-2xl mb-4 flex justify-between items-center shadow-md">
        <h2 className="font-bold text-sm tracking-wide">{columna.titulo}</h2>
        <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
          {tarjetas.length}
        </span>
      </div>

      {/* AREA DE TARJETAS */}
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[650px] pr-1">
        {tarjetas.length > 0 ? (
          tarjetas.map((item) => (
            <TarjetaFunnelCard
              key={item.id}
              tarjeta={item}
              estaArrastrando={tarjetaArrastradaId === item.id}
              onDragStart={onDragStart}
            />
          ))
        ) : (
          <ColumnaVacia />
        )}
      </div>
    </div>
  );
}
