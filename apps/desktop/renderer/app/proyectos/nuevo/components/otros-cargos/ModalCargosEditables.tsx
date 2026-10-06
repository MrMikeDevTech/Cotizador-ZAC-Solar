'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import { Modal } from '../../../../components/Modal';
import { CargoEditable } from '../../types';

interface ModalCargosEditablesProps {
  isOpen: boolean;
  onClose: () => void;
  cargosEditables: CargoEditable[];
  onAgregarCargo: () => void;
  onEliminarCargo: (id: string) => void;
  onUpdateCargo: (id: string, field: 'nombre' | 'monto', value: string | number) => void;
}

export default function ModalCargosEditables({
  isOpen,
  onClose,
  cargosEditables,
  onAgregarCargo,
  onEliminarCargo,
  onUpdateCargo,
}: ModalCargosEditablesProps) {
  return (
    <Modal
      abierto={isOpen}
      onCerrar={onClose}
      titulo="Cargos editables"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-1.5 bg-[#00388d] text-white rounded-full font-semibold text-xs shadow hover:bg-blue-900 transition-colors cursor-pointer"
        >
          Guardar
        </button>
      }
    >
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {cargosEditables.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">
            No hay cargos adicionales. Haz clic en agregar.
          </p>
        ) : (
          cargosEditables.map((cargo) => (
            <div key={cargo.id} className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <input
                type="text"
                placeholder="Nombre del cargo"
                value={cargo.nombre}
                onChange={(e) => onUpdateCargo(cargo.id, 'nombre', e.target.value)}
                className="w-1/2 border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
              />
              <div className="w-1/2 flex items-center gap-1">
                <span className="text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  placeholder="Monto (MXN)"
                  value={cargo.monto || ''}
                  onChange={(e) => onUpdateCargo(cargo.id, 'monto', Number(e.target.value))}
                  className="w-full border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
                />
              </div>
              <button
                type="button"
                onClick={() => onEliminarCargo(cargo.id)}
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
        onClick={onAgregarCargo}
        className="mt-3 flex items-center gap-1 text-xs text-[#2dd4bf] font-bold hover:underline cursor-pointer"
      >
        <Icono icon={Plus} size={14} />
        Agregar otro concepto
      </button>
    </Modal>
  );
}
