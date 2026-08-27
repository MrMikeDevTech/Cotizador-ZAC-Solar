'use client';

import { EstructuraInstalacion } from '../../types';

interface SelectorEstructuraProps {
  estructuras: EstructuraInstalacion[];
  estructuraSeleccionadaId: string | null;
  onToggleEstructura: (id: string) => void;
  onAbrirModalCargos: () => void;
}

export default function SelectorEstructura({
  estructuras,
  estructuraSeleccionadaId,
  onToggleEstructura,
  onAbrirModalCargos,
}: SelectorEstructuraProps) {
  return (
    <div className="space-y-5">
      {/* 1. TIPO DE INSTALACIÓN */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-wider">
          Tipo de instalación
        </h4>
        <div className="space-y-2.5 max-h-48 overflow-y-auto text-xs text-gray-600">
          {estructuras.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={estructuraSeleccionadaId === item.id}
                onChange={() => onToggleEstructura(item.id)}
                className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf] w-4 h-4 border-gray-300"
              />
              <span className="text-gray-700 font-medium">{item.nombre}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2. CARGOS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm min-h-[100px]">
        <h4 className="font-bold text-gray-700 mb-2 text-xs uppercase tracking-wider">Cargos</h4>
      </div>

      {/* 3. CARGOS EDITABLES */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
        <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">
          Cargos Editables
        </span>
        <button
          type="button"
          onClick={onAbrirModalCargos}
          className="w-7 h-7 bg-[#2dd4bf] text-white rounded-full flex items-center justify-center font-bold text-base hover:bg-teal-500 shadow transition cursor-pointer"
          title="Agregar o editar cargos"
        >
          +
        </button>
      </div>
    </div>
  );
}
