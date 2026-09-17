'use client';

interface ContactosPaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  totalRegistros: number;
  registrosPorPagina: number;
  onCambiarPagina: (pagina: number | ((prev: number) => number)) => void;
}

export function ContactosPaginacion({
  paginaActual,
  totalPaginas,
  totalRegistros,
  registrosPorPagina,
  onCambiarPagina,
}: ContactosPaginacionProps) {
  const primerRegistro = totalRegistros > 0 ? (paginaActual - 1) * registrosPorPagina + 1 : 0;
  const ultimoRegistro = Math.min(paginaActual * registrosPorPagina, totalRegistros);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-semibold border-t border-gray-100">
      <span className="text-gray-500 font-normal">
        Mostrando {primerRegistro} - {ultimoRegistro} de {totalRegistros} contactos
      </span>

      <div className="flex items-center gap-2">
        <button
          disabled={paginaActual === 1}
          onClick={() => onCambiarPagina(1)}
          className="px-3 h-8 border border-gray-300 text-[#00388d] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Primera
        </button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => onCambiarPagina(num)}
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
          disabled={paginaActual === totalPaginas}
          onClick={() => onCambiarPagina((prev) => Math.min(prev + 1, totalPaginas))}
          className="px-3 h-8 border border-gray-300 text-[#00388d] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Siguiente
        </button>

        <button
          disabled={paginaActual === totalPaginas}
          onClick={() => onCambiarPagina(totalPaginas)}
          className="px-3 h-8 border border-gray-300 text-[#00388d] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Última
        </button>
      </div>
    </div>
  );
}
