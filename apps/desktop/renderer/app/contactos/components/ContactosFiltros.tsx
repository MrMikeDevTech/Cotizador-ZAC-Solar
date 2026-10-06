'use client';

import { Plus, Search, Loader2 } from 'lucide-react';
import { Icono } from '../../components/Icono';
import { ColumnaOrden } from '../types';

interface ContactosFiltrosProps {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  cargando: boolean;
  criterioOrden: ColumnaOrden | null;
  onRestablecerOrden: () => void;
  onNuevoContacto: () => void;
}

export function ContactosFiltros({
  busqueda,
  onBusquedaChange,
  cargando,
  criterioOrden,
  onRestablecerOrden,
  onNuevoContacto,
}: ContactosFiltrosProps) {
  return (
    <div className="space-y-4">
      {/* BUSCADOR Y BOTÓN NUEVO CONTACTO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/2 space-y-1">
          <label className="text-xs font-semibold text-gray-400">Búsqueda rápida</label>
          <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-[#00388d] transition-colors py-1.5">
            <Icono icon={Search} size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellidos, teléfono o correo..."
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="w-full text-sm text-gray-700 focus:outline-none"
            />
            {cargando && <Icono icon={Loader2} size={14} className="text-gray-400 animate-spin" />}
          </div>
        </div>

        <button
          onClick={onNuevoContacto}
          className="bg-[#00388d] hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md cursor-pointer self-end md:self-auto flex items-center gap-2"
        >
          <Icono icon={Plus} size={16} /> Nuevo contacto
        </button>
      </div>

      {/* RESTABLECER ORDEN */}
      {criterioOrden && (
        <div className="flex justify-end">
          <button
            onClick={onRestablecerOrden}
            className="text-xs text-gray-500 hover:text-[#00388d] underline transition-colors cursor-pointer"
          >
            Restablecer orden original
          </button>
        </div>
      )}
    </div>
  );
}
