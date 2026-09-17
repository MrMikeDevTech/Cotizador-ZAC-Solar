'use client';

interface EstatusBadgeProps {
  estatus: string;
}

export function obtenerColorEstatus(estatus: string): string {
  switch (estatus.toLowerCase()) {
    case 'vendido':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'enviado':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    default:
      return 'text-amber-700 bg-amber-50 border-amber-200';
  }
}

export function EstatusBadge({ estatus }: EstatusBadgeProps) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${obtenerColorEstatus(
        estatus
      )}`}
    >
      {estatus}
    </span>
  );
}
