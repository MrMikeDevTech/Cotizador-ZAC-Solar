'use client';

import { MetodoPrecio } from '../../types';

interface ModalMetodoPrecioProps {
  isOpen: boolean;
  onClose: () => void;
  metodoPrecio: MetodoPrecio;
  setMetodoPrecio: (metodo: MetodoPrecio) => void;
}

export default function ModalMetodoPrecio({
  isOpen,
  onClose,
  metodoPrecio,
  setMetodoPrecio,
}: ModalMetodoPrecioProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
        >
          &times;
        </button>
        <h3 className="text-sm font-bold text-[#00388d] mb-4">Métodos de precio</h3>
        <div className="space-y-3 text-xs text-gray-600">
          {(['unitario', 'watt', 'panel'] as MetodoPrecio[]).map((met) => (
            <label key={met} className="flex items-center gap-3 cursor-pointer capitalize select-none">
              <input
                type="radio"
                name="metodo"
                checked={metodoPrecio === met}
                onChange={() => setMetodoPrecio(met)}
                className="text-[#2dd4bf] focus:ring-[#2dd4bf]"
              />
              {met === 'unitario'
                ? 'Precio unitario'
                : met === 'watt'
                ? 'Precio dólar por watt'
                : 'Precio dólar por panel'}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 border border-gray-300 text-gray-600 rounded-full font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-1.5 bg-[#00388d] text-white rounded-full font-semibold text-xs shadow hover:bg-blue-900 transition-colors cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
