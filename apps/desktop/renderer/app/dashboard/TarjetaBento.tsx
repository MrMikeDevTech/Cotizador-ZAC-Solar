'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Icono } from '../components/Icono';

interface TarjetaBentoProps {
  titulo: string;
  icono: LucideIcon;
  enlace?: { href: string; etiqueta: string };
  /** Clases de span/orden del grid bento; cada tarjeta decide su propio tamaño. */
  className?: string;
  tonoFondo?: 'blanco' | 'azul';
  accionExtra?: ReactNode;
  children: ReactNode;
}

/**
 * Chasis visual común de cada tarjeta del bento: encabezado con icono +
 * título, enlace opcional al módulo completo, y un cuerpo flexible donde
 * cada widget decide qué mostrar (esqueleto, error, vacío o datos reales).
 */
export function TarjetaBento({
  titulo,
  icono,
  enlace,
  className = '',
  tonoFondo = 'blanco',
  accionExtra,
  children,
}: TarjetaBentoProps) {
  const esAzul = tonoFondo === 'azul';

  return (
    <div
      className={`rounded-3xl shadow-lg p-6 flex flex-col ${esAzul ? 'bg-[#00388d] text-white' : 'bg-white text-gray-800'} ${className}`}
    >
      <div className="flex justify-between items-start gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Icono icon={icono} size={20} className={esAzul ? 'text-[#2dd4bf]' : 'text-[#00388d]'} />
          <h3 className="text-lg font-semibold leading-tight">{titulo}</h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {accionExtra}
          {enlace && (
            <Link
              href={enlace.href}
              className={`flex items-center gap-1 text-xs font-semibold hover:underline whitespace-nowrap ${
                esAzul ? 'text-[#2dd4bf]' : 'text-[#00388d]'
              }`}
            >
              {enlace.etiqueta}
              <Icono icon={ArrowRight} size={14} />
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
