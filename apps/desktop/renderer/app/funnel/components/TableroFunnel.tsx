'use client';

import { ColumnaConfig, TarjetaFunnel, TipoColumna } from '../types';
import { ColumnaFunnel } from './ColumnaFunnel';

interface TableroFunnelProps {
  columnas: ColumnaConfig[];
  tarjetas: TarjetaFunnel[];
  tarjetaArrastradaId: string | null;
  columnaSobreVolada: TipoColumna | null;
  onDragOver: (e: React.DragEvent, columna: TipoColumna) => void;
  onDragLeave: () => void;
  onDrop: (columna: TipoColumna) => void;
  onDragStart: (id: string) => void;
}

export function TableroFunnel({
  columnas,
  tarjetas,
  tarjetaArrastradaId,
  columnaSobreVolada,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
}: TableroFunnelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {columnas.map((col) => {
        const items = tarjetas.filter((t) => t.columna === col.clave);
        const estaSobre = columnaSobreVolada === col.clave;

        return (
          <ColumnaFunnel
            key={col.clave}
            columna={col}
            tarjetas={items}
            tarjetaArrastradaId={tarjetaArrastradaId}
            estaSobre={estaSobre}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragStart={onDragStart}
          />
        );
      })}
    </div>
  );
}
