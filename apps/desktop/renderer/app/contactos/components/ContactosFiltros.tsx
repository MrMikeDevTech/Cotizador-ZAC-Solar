'use client';

import { ColumnaOrden } from '../types';

interface ContactosFiltrosProps {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  vendedorFiltro: string;
  onVendedorFiltroChange: (valor: string) => void;
  usuarioActivo: string;
  criterioOrden: ColumnaOrden | null;
  onRestablecerOrden: () => void;
  onNuevoContacto: () => void;
}

export function ContactosFiltros({
  busqueda,
  onBusquedaChange,
  vendedorFiltro,
  onVendedorFiltroChange,
  usuarioActivo,
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
          <input
            type="text"
            placeholder="Buscar por nombre, código, ubicación..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full px-2 py-1.5 border-b-2 border-gray-200 focus:border-[#00388d] focus:outline-none text-sm text-gray-700 transition-colors"
          />
        </div>

        <button
          onClick={onNuevoContacto}
          className="bg-[#00388d] hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md cursor-pointer self-end md:self-auto flex items-center gap-2"
        >
          <span>+</span> Nuevo contacto
        </button>
      </div>

      {/* SELECTOR DE FILTRO Y BOTÓN DE RESTABLECER ORDEN */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Seleccionar contactos de:</label>
          <select
            value={vendedorFiltro}
            onChange={(e) => onVendedorFiltroChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#00388d]"
          >
            <option value="Todos">Todos los usuarios</option>
            <option value="Mis contactos">Mis contactos ({usuarioActivo})</option>
          </select>
        </div>

        {criterioOrden && (
          <button
            onClick={onRestablecerOrden}
            className="text-xs text-gray-500 hover:text-[#00388d] underline transition-colors cursor-pointer"
          >
            Restablecer orden original
          </button>
        )}
      </div>
    </div>
  );
}
