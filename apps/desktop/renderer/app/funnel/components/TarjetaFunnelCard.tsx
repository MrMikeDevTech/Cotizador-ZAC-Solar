'use client';

import Link from 'next/link';
import { TarjetaFunnel } from '../types';
import { EstatusBadge } from './EstatusBadge';

interface TarjetaFunnelCardProps {
  tarjeta: TarjetaFunnel;
  estaArrastrando: boolean;
  onDragStart: (id: string) => void;
}

export function TarjetaFunnelCard({
  tarjeta,
  estaArrastrando,
  onDragStart,
}: TarjetaFunnelCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(tarjeta.id)}
      className={`bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all cursor-grab active:cursor-grabbing space-y-3 ${
        estaArrastrando
          ? 'opacity-40 scale-95 border-dashed border-blue-400'
          : 'opacity-100'
      }`}
    >
      {/* ESTATUS Y TARIFA */}
      <div className="flex justify-between items-center">
        <EstatusBadge estatus={tarjeta.estatus} />
        <span className="text-[10px] text-gray-400 font-medium">
          Tarifa: {tarjeta.tarifa}
        </span>
      </div>

      {/* CLIENTE Y PROYECTO */}
      <div>
        <h3 className="font-bold text-gray-800 text-sm leading-tight">
          {tarjeta.cliente}
        </h3>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {tarjeta.proyecto}
        </p>
      </div>

      {/* DETALLES */}
      <div className="text-[11px] text-gray-500 space-y-1 pt-2 border-t border-gray-100">
        <p>
          <span className="text-gray-400">Autor:</span> {tarjeta.autor}
        </p>
        <p>
          <span className="text-gray-400">Último Paso:</span> {tarjeta.ultimoPaso}
        </p>
        <p className="font-semibold text-gray-800 pt-1">
          <span className="text-gray-400 font-normal">Costo Estimado:</span> $
          {tarjeta.costoEstimado.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* ACCIONES */}
      <div className="pt-2 flex justify-end gap-2 text-xs border-t border-gray-50">
        <Link
          href="/proyectos"
          className="text-[#00388d] font-semibold hover:underline text-[11px]"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}
