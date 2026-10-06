'use client';

import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Icono } from '../../components/Icono';
import { FaseFunnel } from '../types';

interface ProyectosFiltrosProps {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  fases: FaseFunnel[];
  faseFiltro: string;
  onFaseFiltroChange: (slug: string) => void;
  onLimpiar: () => void;
  cargando: boolean;
}

export function ProyectosFiltros({
  busqueda,
  onBusquedaChange,
  fases,
  faseFiltro,
  onFaseFiltroChange,
  onLimpiar,
  cargando,
}: ProyectosFiltrosProps) {
  return (
    <div className="space-y-4 border-b border-gray-100 pb-6">
      {/* BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-1/3 flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2">
          <Icono icon={Search} size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o proyecto..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full text-xs focus:outline-none"
          />
          {cargando && <Icono icon={Loader2} size={14} className="text-gray-400 animate-spin" />}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button className="border border-[#00388d] text-[#00388d] hover:bg-blue-50 px-5 py-2 rounded-full text-xs font-semibold transition-colors">
            Cotización Rápida
          </button>
          <Link
            href="/proyectos/nuevo"
            className="bg-[#00388d] hover:bg-blue-900 text-white px-5 py-2 rounded-full text-xs font-semibold transition-colors shadow-md"
          >
            + Nuevo proyecto
          </Link>
        </div>
      </div>

      {/* FILTRO POR FASE */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="text-gray-500 font-medium">Filtrar por:</label>

        <select
          value={faseFiltro}
          onChange={(e) => onFaseFiltroChange(e.target.value)}
          className="border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">Todas las fases</option>
          {fases.map((fase) => (
            <option key={fase.slug} value={fase.slug}>
              {fase.nombre}
            </option>
          ))}
        </select>

        {(busqueda || faseFiltro) && (
          <button
            onClick={onLimpiar}
            className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded-full text-gray-600 transition-colors cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
