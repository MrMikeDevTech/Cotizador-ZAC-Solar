'use client';

interface FunnelHeaderProps {
  cargando: boolean;
  onActualizar: () => void;
}

export function FunnelHeader({ cargando, onActualizar }: FunnelHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
          Funnel de Ventas
        </h1>
        <p className="text-white/80 text-xs mt-1">
          Arrastra las tarjetas entre columnas para cambiar su fase y estatus automáticamente.
        </p>
      </div>
    </div>
  );
}
