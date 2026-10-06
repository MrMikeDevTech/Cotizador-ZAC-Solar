'use client';

import { Modal } from '../../../../components/Modal';
import { TipoMoneda } from '../../types';

interface ModalAjustesExtrasProps {
  isOpen: boolean;
  onClose: () => void;
  descuento5: boolean;
  setDescuento5: (val: boolean) => void;
  descuento10: boolean;
  setDescuento10: (val: boolean) => void;
  subtotalConDescuento: number;
  tipoMoneda: TipoMoneda;
}

export default function ModalAjustesExtras({
  isOpen,
  onClose,
  descuento5,
  setDescuento5,
  descuento10,
  setDescuento10,
  subtotalConDescuento,
  tipoMoneda,
}: ModalAjustesExtrasProps) {
  const formattedPrecio = `$${subtotalConDescuento.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${tipoMoneda}`;

  return (
    <Modal
      abierto={isOpen}
      onCerrar={onClose}
      titulo="Ajustes extras"
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
        <p className="font-semibold text-gray-500">Aplicar descuento a cotización</p>
        <label className="flex justify-between items-center cursor-pointer select-none">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={descuento5}
              onChange={(e) => setDescuento5(e.target.checked)}
              className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf]"
            />
            Pago en una sola exhibición
          </span>
          <span className="font-bold">5.00%</span>
        </label>
        <label className="flex justify-between items-center cursor-pointer select-none">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={descuento10}
              onChange={(e) => setDescuento10(e.target.checked)}
              className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf]"
            />
            Pago en una sola exhibición
          </span>
          <span className="font-bold">10.00%</span>
        </label>
        <div className="pt-2">
          <label className="block mb-1 text-gray-400">Precio del sistema con descuento</label>
          <input
            type="text"
            readOnly
            value={formattedPrecio}
            className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-xs font-bold text-gray-700"
          />
        </div>
      </div>
    </Modal>
  );
}
