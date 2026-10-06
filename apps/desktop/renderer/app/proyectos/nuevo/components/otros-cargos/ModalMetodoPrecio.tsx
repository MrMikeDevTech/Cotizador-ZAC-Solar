'use client';

import { Modal } from '../../../../components/Modal';
import { MetodoPrecio } from '../../types';

interface ModalMetodoPrecioProps {
  isOpen: boolean;
  onClose: () => void;
  metodoPrecio: MetodoPrecio;
  setMetodoPrecio: (metodo: MetodoPrecio) => void;
}

const ETIQUETAS: Record<MetodoPrecio, string> = {
  unitario: 'Precio unitario',
  watt: 'Precio dólar por watt',
  panel: 'Precio dólar por panel',
};

export default function ModalMetodoPrecio({
  isOpen,
  onClose,
  metodoPrecio,
  setMetodoPrecio,
}: ModalMetodoPrecioProps) {
  return (
    <Modal
      abierto={isOpen}
      onCerrar={onClose}
      titulo="Métodos de precio"
      tamano="sm"
      footer={
        <>
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
        </>
      }
    >
      <div className="space-y-3 text-xs text-gray-600">
        {(Object.keys(ETIQUETAS) as MetodoPrecio[]).map((met) => (
          <label key={met} className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="radio"
              name="metodo"
              checked={metodoPrecio === met}
              onChange={() => setMetodoPrecio(met)}
              className="text-[#2dd4bf] focus:ring-[#2dd4bf]"
            />
            {ETIQUETAS[met]}
          </label>
        ))}
      </div>
    </Modal>
  );
}
