'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

interface Proyecto {
  id: string;
  codigo: string;
  contacto: string;
  nombre: string;
  tarifa: string;
  autor: string;
  localidad: string;
  etapa: string;
  estatus: string;
  fecha: string;
}

const proyectosEjemplo: Proyecto[] = [
  {
    id: '1',
    codigo: 'ZAC-056-1A',
    contacto: 'Roberto López Gómez',
    nombre: 'Residencial López',
    tarifa: 'PDBT',
    autor: 'Miguel Angel Martinez',
    localidad: 'Compostela',
    etapa: '5 - Confirmación',
    estatus: 'En desarrollo',
    fecha: '04/09/2026',
  },
  {
    id: '2',
    codigo: 'ZAC-003-1B',
    contacto: 'Elvira Vázquez Tovar',
    nombre: 'Comercial Vázquez',
    tarifa: 'PDBT',
    autor: 'Miguel Angel Martinez',
    localidad: 'Tuxpan',
    etapa: '5 - Confirmación',
    estatus: 'En desarrollo',
    fecha: '26/08/2026',
  },
  {
    id: '3',
    codigo: 'ZAC-590-1B',
    contacto: 'José Luis Romero Espinoza',
    nombre: 'Taller Romero',
    tarifa: '1B',
    autor: 'Miguel Angel Martinez',
    localidad: 'Aguascalientes',
    etapa: '5 - Confirmación',
    estatus: 'En desarrollo',
    fecha: '24/08/2026',
  },
];

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosEjemplo);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  const [filtroEtapa, setFiltroEtapa] = useState('Todas');
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    api
      .get<Proyecto[]>('/api/proyectos')
      .then((data) => {
        if (data && data.length > 0) setProyectos(data);
      })
      .catch(() => {
        // Mantiene los datos de ejemplo si la API aún no está lista
      });
  }, []);

  const proyectosFiltrados = proyectos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.contacto.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstatus = filtroEstatus === 'Todos' || p.estatus === filtroEstatus;
    const coincideEtapa = filtroEtapa === 'Todas' || p.etapa === filtroEtapa;

    return coincideBusqueda && coincideEstatus && coincideEtapa;
  });

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TÍTULO DEL MÓDULO */}
        <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
          Proyectos
        </h1>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          
          {/* BARRA SUPERIOR DE ACCIONES */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-100 pb-6">
            <div className="w-full sm:w-1/3">
              <input
                type="text"
                placeholder="Buscar por código, cliente o proyecto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
              />
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

          {/* FILTROS SECUNDARIOS */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="text-gray-500 font-medium">Filtrar por:</label>

            <select
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
              className="border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
            >
              <option value="Todos">Todos los estatus</option>
              <option value="En desarrollo">En desarrollo</option>
              <option value="Enviados">Enviados</option>
              <option value="Vendidos">Vendidos</option>
              <option value="Perdidos">Perdidos</option>
            </select>

            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className="border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-700 focus:outline-none"
            >
              <option value="Todas">Todas las etapas</option>
              <option value="5 - Confirmación">5 - Confirmación</option>
              <option value="1 - Prospecto">1 - Prospecto</option>
            </select>

            <button className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded-full text-gray-600 transition-colors">
              Limpiar
            </button>
          </div>

          {/* TABLA DE PROYECTOS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Contacto</th>
                  <th className="py-3 px-3">Proyecto</th>
                  <th className="py-3 px-3">Tarifa</th>
                  <th className="py-3 px-3">Autor</th>
                  <th className="py-3 px-3">Localidad</th>
                  <th className="py-3 px-3">Etapa</th>
                  <th className="py-3 px-3">Estatus</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {proyectosFiltrados.length > 0 ? (
                  proyectosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#00388d]">{p.codigo}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">{p.contacto}</td>
                      <td className="py-3 px-3 text-gray-600">{p.nombre}</td>
                      <td className="py-3 px-3">{p.tarifa}</td>
                      <td className="py-3 px-3 text-gray-500">{p.autor}</td>
                      <td className="py-3 px-3 text-gray-500">{p.localidad}</td>
                      <td className="py-3 px-3">{p.etapa}</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {p.estatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">{p.fecha}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center items-center gap-2 text-gray-400">
                          <button className="hover:text-blue-600 transition-colors" title="Ver detalles">
                            👁️
                          </button>
                          <button className="hover:text-amber-600 transition-colors" title="Editar">
                            ✏️
                          </button>
                          <button className="hover:text-red-600 transition-colors" title="Eliminar">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400 italic">
                      No se encontraron proyectos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN Y RESUMEN */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div>
              Página {paginaActual} de 1 | Mostrando {proyectosFiltrados.length} de {proyectos.length} proyectos
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button className="px-3 py-1 border border-[#00388d] bg-[#00388d] text-white rounded-lg font-semibold">
                1
              </button>
              <button
                disabled
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}