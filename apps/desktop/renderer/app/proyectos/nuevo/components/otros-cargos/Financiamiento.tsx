'use client';

interface FinanciamientoProps {
  onSeleccionarProveedor?: (proveedor: string) => void;
}

export default function Financiamiento({ onSeleccionarProveedor }: FinanciamientoProps) {
  return (
    <div className="mt-8 pt-4">
      <h4 className="text-xs font-bold text-gray-500 mb-4 tracking-wider">
        Simulación de financiamiento
      </h4>
      <div className="flex justify-center items-center gap-6">
        <button
          type="button"
          onClick={() => onSeleccionarProveedor?.('SERFIMEX')}
          className="border border-[#2dd4bf] text-[#00388d] bg-white px-8 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-teal-50 transition cursor-pointer"
        >
          SERFIMEX
        </button>
        <button
          type="button"
          onClick={() => onSeleccionarProveedor?.('redgirasol')}
          className="border border-[#8cc63f] text-[#8cc63f] bg-white px-8 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-green-50 transition cursor-pointer"
        >
          redgirasol.
        </button>
      </div>
    </div>
  );
}
