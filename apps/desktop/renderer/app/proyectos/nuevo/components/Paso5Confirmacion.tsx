'use client';

interface Paso5ConfirmacionProps {
  onAnterior: () => void;
  onFinalizar?: () => void;
}

export default function Paso5Confirmacion({ onAnterior, onFinalizar }: Paso5ConfirmacionProps) {
  return (
    <div className="py-12 text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-[#00388d] mb-4">Paso 5: Confirmación</h3>
      <p className="text-gray-600">Revisa la información antes de generar la cotización final.</p>

      <div className="mt-8 flex justify-center items-center gap-6">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 underline transition-colors cursor-pointer"
        >
          Regresar a Otros cargos
        </button>
        <button
          type="button"
          onClick={onFinalizar}
          className="bg-[#8cc63f] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-green-600 transition-colors cursor-pointer"
        >
          Crear Proyecto
        </button>
      </div>
    </div>
  );
}
