'use client';

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Icono } from './Icono';

interface PaginationProps {
  paginaActual: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  totalRegistros?: number;
}

const CLASE_BOTON_NAV =
  'px-3 h-8 border border-gray-300 text-[#00388d] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer flex items-center gap-1';

/**
 * Paginación base del proyecto. El estado activo usa `bg-[#00388d] text-white`
 * y el inactivo `border-gray-300 text-[#00388d] hover:bg-blue-50`; los botones
 * deshabilitados solo bajan opacidad (`opacity-40`) sin perder legibilidad —
 * nunca cambian a un texto claro sobre fondo claro.
 */
export function Pagination({ paginaActual, totalPaginas, onCambiar, totalRegistros }: PaginationProps) {
  const paginas = Array.from({ length: Math.max(totalPaginas, 0) }, (_, i) => i + 1);
  const esPrimera = paginaActual <= 1;
  const esUltima = paginaActual >= totalPaginas;

  const ir = (pagina: number) => {
    const destino = Math.min(Math.max(pagina, 1), Math.max(totalPaginas, 1));
    if (destino !== paginaActual) onCambiar(destino);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-semibold border-t border-gray-100">
      {typeof totalRegistros === 'number' && (
        <span className="text-gray-500 font-normal">{totalRegistros} registros en total</span>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={esPrimera}
          onClick={() => ir(1)}
          className={CLASE_BOTON_NAV}
          aria-label="Primera página"
        >
          <Icono icon={ChevronsLeft} size={14} />
          <span className="hidden sm:inline">Primera</span>
        </button>

        <button
          type="button"
          disabled={esPrimera}
          onClick={() => ir(paginaActual - 1)}
          className={CLASE_BOTON_NAV}
          aria-label="Página anterior"
        >
          <Icono icon={ChevronLeft} size={14} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {paginas.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => ir(num)}
            aria-current={paginaActual === num ? 'page' : undefined}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              paginaActual === num
                ? 'bg-[#00388d] text-white border-[#00388d]'
                : 'border-gray-300 text-[#00388d] hover:bg-blue-50'
            }`}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          disabled={esUltima}
          onClick={() => ir(paginaActual + 1)}
          className={CLASE_BOTON_NAV}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <Icono icon={ChevronRight} size={14} />
        </button>

        <button
          type="button"
          disabled={esUltima}
          onClick={() => ir(totalPaginas)}
          className={CLASE_BOTON_NAV}
          aria-label="Última página"
        >
          <span className="hidden sm:inline">Última</span>
          <Icono icon={ChevronsRight} size={14} />
        </button>
      </div>
    </div>
  );
}
