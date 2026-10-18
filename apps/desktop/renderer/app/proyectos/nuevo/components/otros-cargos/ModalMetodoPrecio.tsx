'use client';

import { useEffect, useState } from 'react';
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
  // Borrador local: mientras el modal está abierto, los radios solo tocan
  // este estado. El padre (`metodoPrecio`) no cambia hasta "Guardar".
  const [borrador, setBorrador] = useState<MetodoPrecio>(metodoPrecio);

  // Resincroniza el borrador cada vez que el modal se abre (no solo al
  // montar), para que "Cancelar" nunca deje un valor obsoleto visible la
  // próxima vez que se abra.
  useEffect(() => {
    if (isOpen) {
      setBorrador(metodoPrecio);
    }
  }, [isOpen, metodoPrecio]);

  const handleGuardar = () => {
    setMetodoPrecio(borrador);
    onClose();
  };

  // Cancelar, la X, el backdrop y Escape todos llegan aquí (`onCerrar` del
  // Modal compartido) y simplemente cierran: el borrador se descarta y el
  // padre nunca se tocó.
  const handleCancelar = () => {
    onClose();
  };

  return (
    <Modal
      abierto={isOpen}
      onCerrar={handleCancelar}
      titulo="Métodos de precio"
      tamano="sm"
      footer={
        <>
          <button
            type="button"
            onClick={handleCancelar}
            className="px-5 py-1.5 border border-gray-300 text-gray-600 rounded-full font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
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
              checked={borrador === met}
              onChange={() => setBorrador(met)}
              className="text-[#2dd4bf] focus:ring-[#2dd4bf]"
            />
            {ETIQUETAS[met]}
          </label>
        ))}
      </div>
    </Modal>
  );
}
