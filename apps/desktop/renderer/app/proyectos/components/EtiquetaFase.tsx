'use client';

import { FaseFunnel } from '../types';

interface EtiquetaFaseProps {
  fase: FaseFunnel;
}

/**
 * Etiqueta de fase del funnel. Usa el color que entrega la API (no se
 * inventan colores por estatus) y envuelve el texto en vez de forzar un
 * ancho fijo: a 375px de viewport una fase con nombre largo ya no empuja el
 * resto de la fila ni se corta.
 */
export function EtiquetaFase({ fase }: EtiquetaFaseProps) {
  return (
    <span
      className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-tight whitespace-normal break-words"
      style={{
        backgroundColor: `${fase.color}1f`,
        borderColor: `${fase.color}55`,
        color: fase.color,
      }}
    >
      {fase.nombre}
    </span>
  );
}
