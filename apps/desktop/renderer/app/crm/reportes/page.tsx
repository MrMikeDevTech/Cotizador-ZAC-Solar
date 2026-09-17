'use client';

import { useState } from 'react';

type TipoReporte = 'home' | 'actualizaciones' | 'proyectos' | 'vendedores' | 'clientes';

interface LogActualizacion {
  id: number;
  autor: string;
  tipo: string;
  actualizacionEn: string;
  cambios: string;
  fecha: string;
}

const MOCK_ACTUALIZACIONES: LogActualizacion[] = Array.from({ length: 28 }, (_, i) => ({
  id: i + 1,
  autor: 'mae2492.martinez@gmail.com',
  tipo: 'Eliminar proyecto',
  actualizacionEn: `Proyecto #${28 - i}`,
  cambios: 'Accion: Se elimino',
  fecha: 'Aug. 24, 2026, 10:32 p.m.',
}));

const ITEMS_POR_PAGINA = 10;

export default function ReportesCRMPage() {
  const [reporteActivo, setReporteActivo] = useState<TipoReporte>('home');
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState('Todos los proyectos');
  const [filtroVendedor, setFiltroVendedor] = useState('Todos los vendedores');
  const [filtroCliente, setFiltroCliente] = useState('Todos los contactos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Lógica de paginación
  const totalPaginas = Math.ceil(MOCK_ACTUALIZACIONES.length / ITEMS_POR_PAGINA);
  const indiceInicial = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const logsPaginaActual = MOCK_ACTUALIZACIONES.slice(indiceInicial, indiceInicial + ITEMS_POR_PAGINA);

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 md:p-8 font-sans text-slate-800 bg-transparent">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* NAVEGACIÓN Y TÍTULO (A HORA EN BLANCO) */}
        <div className="flex items-center justify-between pb-2">
          <div>
            {reporteActivo !== 'home' && (
              <button
                onClick={() => {
                  setReporteActivo('home');
                  setPaginaActual(1);
                }}
                className="text-white/80 hover:text-white text-xs font-semibold mb-1 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
              >
                ← Volver a Menú de Reportes
              </button>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {reporteActivo === 'home' && 'Reportes CRM'}
              {reporteActivo === 'actualizaciones' && 'Reporte Actualizaciones (Admin CRM)'}
              {reporteActivo === 'proyectos' && 'Reporte Proyectos'}
              {reporteActivo === 'vendedores' && 'Reporte Vendedores'}
              {reporteActivo === 'clientes' && 'Reporte Clientes'}
            </h1>
          </div>
        </div>

        {/* 1. MENÚ PRINCIPAL */}
        {reporteActivo === 'home' && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
              Selecciona un tipo de reporte
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl">
                  Actualización de cambios (Configuraciones).
                </span>
                <button
                  onClick={() => setReporteActivo('actualizaciones')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold hover:underline text-left w-fit cursor-pointer"
                >
                  Ver Reporte →
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl">Proyectos.</span>
                <button
                  onClick={() => setReporteActivo('proyectos')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold hover:underline text-left w-fit cursor-pointer"
                >
                  Ver Reporte →
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl">Vendedores</span>
                <button
                  onClick={() => setReporteActivo('vendedores')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold hover:underline text-left w-fit cursor-pointer"
                >
                  Ver Reporte →
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl">Clientes</span>
                <button
                  onClick={() => setReporteActivo('clientes')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold hover:underline text-left w-fit cursor-pointer"
                >
                  Ver Reporte →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. REPORTE ACTUALIZACIONES */}
        {reporteActivo === 'actualizaciones' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Autor</th>
                    <th className="pb-3 px-3">Tipo de actualización</th>
                    <th className="pb-3 px-3">Actualización en</th>
                    <th className="pb-3 px-3">Cambios</th>
                    <th className="pb-3 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsPaginaActual.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-700">{log.autor}</td>
                      <td className="py-3 px-3">{log.tipo}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{log.actualizacionEn}</td>
                      <td className="py-3 px-3">{log.cambios}</td>
                      <td className="py-3 px-3 text-slate-400">{log.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 text-xs font-semibold">
              <span className="text-slate-400 font-normal">
                Mostrando {indiceInicial + 1} - {Math.min(indiceInicial + ITEMS_POR_PAGINA, MOCK_ACTUALIZACIONES.length)} de {MOCK_ACTUALIZACIONES.length} reportes
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => cambiarPagina(1)}
                  disabled={paginaActual === 1}
                  className="px-2.5 h-7 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Primera
                </button>

                <button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="px-2.5 h-7 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => cambiarPagina(num)}
                    className={`w-7 h-7 rounded-lg border transition-colors cursor-pointer ${
                      paginaActual === num
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="px-2.5 h-7 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Siguiente
                </button>

                <button
                  onClick={() => cambiarPagina(totalPaginas)}
                  disabled={paginaActual === totalPaginas}
                  className="px-2.5 h-7 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Última
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. REPORTE PROYECTOS */}
        {reporteActivo === 'proyectos' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Filtrar por Usuario</label>
                <select
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                >
                  <option value="Todos los proyectos">Todos los proyectos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer">
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. REPORTE VENDEDORES */}
        {reporteActivo === 'vendedores' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Filtrar por Vendedor</label>
                <select
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                >
                  <option value="Todos los vendedores">Todos los vendedores</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer">
                  Generar Reporte
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400">Sin Proyectos</p>
          </div>
        )}

        {/* 5. REPORTE CLIENTES */}
        {reporteActivo === 'clientes' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Filtrar por Cliente</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                >
                  <option value="Todos los contactos">Todos los contactos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer">
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}