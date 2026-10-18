'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import { Modal } from '../../../../components/Modal';
import { CargoEditable } from '../../types';

interface ModalCargosEditablesProps {
  isOpen: boolean;
  onClose: () => void;
  cargosEditables: CargoEditable[];
  // Setter de la lista completa en vez de tres callbacks granulares: el
  // modal necesita agregar/editar/eliminar sobre un borrador propio, y
  // reconciliar contra el padre solo al guardar. Con callbacks granulares
  // cada operación habría escrito en vivo sobre el estado del padre.
  setCargosEditables: (cargos: CargoEditable[]) => void;
}

export default function ModalCargosEditables({
  isOpen,
  onClose,
  cargosEditables,
  setCargosEditables,
}: ModalCargosEditablesProps) {
  // Borrador local: copia profunda suficiente (los cargos son objetos
  // planos, así que una copia superficial de cada elemento basta). Agregar,
  // editar y eliminar actúan solo sobre este arreglo mientras el modal está
  // abierto.
  const [borrador, setBorrador] = useState<CargoEditable[]>(
    cargosEditables.map((cargo) => ({ ...cargo }))
  );

  // Resincroniza el borrador cada vez que el modal se abre (no solo al
  // montar), para que "Cancelar" nunca deje una lista obsoleta visible la
  // próxima vez que se abra.
  useEffect(() => {
    if (isOpen) {
      setBorrador(cargosEditables.map((cargo) => ({ ...cargo })));
    }
  }, [isOpen, cargosEditables]);

  const handleAgregarCargo = (): void => {
    setBorrador((prev) => [...prev, { id: Date.now().toString(), nombre: '', monto: 0 }]);
  };

  const handleEliminarCargo = (id: string): void => {
    setBorrador((prev) => prev.filter((cargo) => cargo.id !== id));
  };

  const handleUpdateCargo = (id: string, field: 'nombre' | 'monto', value: string | number): void => {
    setBorrador((prev) =>
      prev.map((cargo) => (cargo.id === id ? { ...cargo, [field]: value } : cargo))
    );
  };

  const handleGuardar = () => {
    setCargosEditables(borrador);
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
      titulo="Cargos editables"
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
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {borrador.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">
            No hay cargos adicionales. Haz clic en agregar.
          </p>
        ) : (
          borrador.map((cargo) => (
            <div key={cargo.id} className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <input
                type="text"
                placeholder="Nombre del cargo"
                value={cargo.nombre}
                onChange={(e) => handleUpdateCargo(cargo.id, 'nombre', e.target.value)}
                className="w-1/2 border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
              />
              <div className="w-1/2 flex items-center gap-1">
                <span className="text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  placeholder="Monto (MXN)"
                  value={cargo.monto || ''}
                  onChange={(e) => handleUpdateCargo(cargo.id, 'monto', Number(e.target.value))}
                  className="w-full border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
                />
              </div>
              <button
                type="button"
                onClick={() => handleEliminarCargo(cargo.id)}
                className="text-gray-400 hover:text-red-500 px-1.5 cursor-pointer"
                aria-label={`Eliminar el cargo ${cargo.nombre || 'sin nombre'}`}
                title="Eliminar cargo"
              >
                <Icono icon={Trash2} size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleAgregarCargo}
        className="mt-3 flex items-center gap-1 text-xs text-[#2dd4bf] font-bold hover:underline cursor-pointer"
      >
        <Icono icon={Plus} size={14} />
        Agregar otro concepto
      </button>
    </Modal>
  );
}
