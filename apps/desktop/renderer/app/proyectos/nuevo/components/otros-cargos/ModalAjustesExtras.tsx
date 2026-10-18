'use client';

import { useEffect, useState } from 'react';
import { aplicarDescuento } from '@cotizador/shared';
import { Modal } from '../../../../components/Modal';
import { TipoMoneda } from '../../types';

interface ModalAjustesExtrasProps {
  isOpen: boolean;
  onClose: () => void;
  descuento5: boolean;
  setDescuento5: (val: boolean) => void;
  descuento10: boolean;
  setDescuento10: (val: boolean) => void;
  // Subtotal SIN descuento (antes de aplicar 5%/10%). Con esto el modal
  // puede calcular su propia vista previa a partir del borrador, sin que
  // el padre necesite reaccionar en vivo a los checkboxes.
  subtotalSinDescuento: number;
  tipoMoneda: TipoMoneda;
}

export default function ModalAjustesExtras({
  isOpen,
  onClose,
  descuento5,
  setDescuento5,
  descuento10,
  setDescuento10,
  subtotalSinDescuento,
  tipoMoneda,
}: ModalAjustesExtrasProps) {
  // Borrador local: los checkboxes solo tocan este estado mientras el modal
  // está abierto. El padre (descuento5/descuento10) no se entera de nada
  // hasta que se pulsa "Guardar".
  const [borradorDescuento5, setBorradorDescuento5] = useState(descuento5);
  const [borradorDescuento10, setBorradorDescuento10] = useState(descuento10);

  // Resincroniza el borrador cada vez que el modal se abre (no solo al
  // montar): si el usuario cancela, reabre y el padre cambió por otra vía,
  // debe ver el valor real del padre, no el descartado.
  useEffect(() => {
    if (isOpen) {
      setBorradorDescuento5(descuento5);
      setBorradorDescuento10(descuento10);
    }
  }, [isOpen, descuento5, descuento10]);

  // La vista previa de "Precio del sistema con descuento" se calcula AQUÍ,
  // dentro del modal, a partir del borrador — no del estado real del padre.
  // Si usáramos el subtotal ya descontado del padre, ese número dejaría de
  // reaccionar a los checkboxes en cuanto los descuentos dejan de aplicarse
  // en vivo, y el campo quedaría inútil.
  //
  // La regla del descuento viene de `@cotizador/shared` y no se replica aquí:
  // los porcentajes son del motor, y tenerlos duplicados haría que cambiar
  // uno dejase al modal mostrando una cifra y a la cotización otra.
  const { subtotalConDescuento: subtotalConDescuentoPreview } = aplicarDescuento(
    subtotalSinDescuento,
    borradorDescuento5,
    borradorDescuento10
  );

  const formattedPrecio = `$${subtotalConDescuentoPreview.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${tipoMoneda}`;

  const handleGuardar = () => {
    setDescuento5(borradorDescuento5);
    setDescuento10(borradorDescuento10);
    onClose();
  };

  // Cancelar, la X, el backdrop y Escape todos llegan aquí y simplemente
  // cierran: el borrador se descarta y el padre nunca se tocó.
  const handleCancelar = () => {
    onClose();
  };

  return (
    <Modal
      abierto={isOpen}
      onCerrar={handleCancelar}
      titulo="Ajustes extras"
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
        <p className="font-semibold text-gray-500">Aplicar descuento a cotización</p>
        <label className="flex justify-between items-center cursor-pointer select-none">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={borradorDescuento5}
              onChange={(e) => setBorradorDescuento5(e.target.checked)}
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
              checked={borradorDescuento10}
              onChange={(e) => setBorradorDescuento10(e.target.checked)}
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
