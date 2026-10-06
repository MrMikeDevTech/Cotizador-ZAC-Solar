'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, FolderKanban, Activity, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { DataTable, type ColumnaTabla } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { Icono } from '../../components/Icono';

type TipoReporte = 'home' | 'actividad' | 'proyectos';

interface FaseResumen {
  faseId: string;
  slug: string;
  nombre: string;
  color: string;
  total: number;
}

interface ResumenReportes {
  proyectosPorFase: FaseResumen[];
  contactosNuevosMes: number;
  cotizacionesEmitidas: number;
  montoTotalCotizado: number;
  montoTotalVendido: number;
}

interface ProyectoReporte {
  id: string;
  codigo: string;
  nombre: string;
  createdAt: string;
  fase: { id: string; slug: string; nombre: string; color: string };
  contacto: { id: string; nombre: string; apellidoPaterno: string };
  granTotal: number | null;
}

interface ItemActividad {
  id: string;
  tipo: 'proyecto' | 'contacto';
  accion: 'creado' | 'actualizado';
  titulo: string;
  fecha: string;
}

interface RespuestaActividad {
  datos: ItemActividad[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const POR_PAGINA_ACTIVIDAD = 10;

function formatearMoneda(valor: number | null): string {
  if (valor === null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Reportes del CRM. Solo se consumen los endpoints que el backend realmente
 * expone (`/resumen`, `/proyectos`, `/actividad`): los reportes de
 * "Vendedores" y "Clientes" del mock original no tienen respaldo real y se
 * eliminan en vez de mostrar datos inventados.
 */
export default function ReportesCRMPage() {
  const [reporteActivo, setReporteActivo] = useState<TipoReporte>('home');

  const [resumen, setResumen] = useState<ResumenReportes | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyectosResultado, setProyectosResultado] = useState<ProyectoReporte[] | null>(null);
  const [cargandoProyectos, setCargandoProyectos] = useState(false);

  const [paginaActividad, setPaginaActividad] = useState(1);
  const [datosActividad, setDatosActividad] = useState<RespuestaActividad | null>(null);
  const [cargandoActividad, setCargandoActividad] = useState(false);

  useEffect(() => {
    setCargandoResumen(true);
    api
      .get<ResumenReportes>('/api/reportes/resumen')
      .then(setResumen)
      .catch((error) => {
        const mensaje = error instanceof ApiError ? error.message : 'No se pudo cargar el resumen de reportes.';
        toast.error(mensaje);
        setResumen(null);
      })
      .finally(() => setCargandoResumen(false));
  }, []);

  const cargarActividad = useCallback(async () => {
    setCargandoActividad(true);
    try {
      const datos = await api.get<RespuestaActividad>(
        `/api/reportes/actividad?pagina=${paginaActividad}&porPagina=${POR_PAGINA_ACTIVIDAD}`
      );
      setDatosActividad(datos);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo cargar la actividad reciente.';
      toast.error(mensaje);
      setDatosActividad(null);
    } finally {
      setCargandoActividad(false);
    }
  }, [paginaActividad]);

  useEffect(() => {
    if (reporteActivo === 'actividad') cargarActividad();
  }, [reporteActivo, cargarActividad]);

  const handleGenerarReporteProyectos = async (e: FormEvent) => {
    e.preventDefault();
    setCargandoProyectos(true);
    const params = new URLSearchParams();
    if (fechaInicio) params.set('desde', new Date(fechaInicio).toISOString());
    if (fechaFin) params.set('hasta', new Date(fechaFin).toISOString());
    const qs = params.toString();

    try {
      const datos = await api.get<ProyectoReporte[]>(`/api/reportes/proyectos${qs ? `?${qs}` : ''}`);
      setProyectosResultado(datos);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo generar el reporte de proyectos.';
      toast.error(mensaje);
      setProyectosResultado(null);
    } finally {
      setCargandoProyectos(false);
    }
  };

  const irAReporte = (tipo: TipoReporte) => {
    setReporteActivo(tipo);
    if (tipo === 'actividad') setPaginaActividad(1);
  };

  const totalProyectos = useMemo(
    () => resumen?.proyectosPorFase.reduce((acc, f) => acc + f.total, 0) ?? 0,
    [resumen]
  );

  const columnasActividad: ColumnaTabla<ItemActividad>[] = [
    {
      clave: 'tipo',
      encabezado: 'Tipo',
      render: (a) => (
        <span className="font-semibold text-gray-700 capitalize">{a.tipo === 'proyecto' ? 'Proyecto' : 'Contacto'}</span>
      ),
    },
    {
      clave: 'accion',
      encabezado: 'Acción',
      render: (a) => <span className="capitalize">{a.accion}</span>,
    },
    { clave: 'titulo', encabezado: 'Título' },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      render: (a) => <span className="text-slate-400">{formatearFecha(a.fecha)}</span>,
    },
  ];

  const columnasProyectos: ColumnaTabla<ProyectoReporte>[] = [
    { clave: 'codigo', encabezado: 'Código' },
    { clave: 'nombre', encabezado: 'Nombre' },
    {
      clave: 'fase',
      encabezado: 'Fase',
      render: (p) => (
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: p.fase.color }}
        >
          {p.fase.nombre}
        </span>
      ),
    },
    {
      clave: 'contacto',
      encabezado: 'Contacto',
      render: (p) => `${p.contacto.nombre} ${p.contacto.apellidoPaterno}`.trim(),
    },
    {
      clave: 'granTotal',
      encabezado: 'Monto',
      render: (p) => formatearMoneda(p.granTotal),
    },
    {
      clave: 'createdAt',
      encabezado: 'Fecha',
      render: (p) => <span className="text-slate-400">{formatearFecha(p.createdAt)}</span>,
    },
  ];

  return (
    <div className="w-full min-h-screen p-4 md:p-8 font-sans text-slate-800 bg-transparent">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div>
            {reporteActivo !== 'home' && (
              <button
                onClick={() => irAReporte('home')}
                className="text-white/80 hover:text-white text-xs font-semibold mb-1 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
              >
                <Icono icon={ArrowLeft} size={12} />
                Volver a menú de reportes
              </button>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {reporteActivo === 'home' && 'Reportes CRM'}
              {reporteActivo === 'actividad' && 'Actividad reciente'}
              {reporteActivo === 'proyectos' && 'Reporte de proyectos'}
            </h1>
          </div>
        </div>

        {/* MENÚ PRINCIPAL */}
        {reporteActivo === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <TarjetaResumen
                titulo="Proyectos totales"
                valor={cargandoResumen ? '…' : String(totalProyectos)}
              />
              <TarjetaResumen
                titulo="Contactos nuevos (mes)"
                valor={cargandoResumen ? '…' : String(resumen?.contactosNuevosMes ?? 0)}
              />
              <TarjetaResumen
                titulo="Cotizaciones emitidas"
                valor={cargandoResumen ? '…' : String(resumen?.cotizacionesEmitidas ?? 0)}
              />
              <TarjetaResumen
                titulo="Monto total cotizado"
                valor={cargandoResumen ? '…' : formatearMoneda(resumen?.montoTotalCotizado ?? 0)}
              />
              <TarjetaResumen
                titulo="Monto total vendido"
                valor={cargandoResumen ? '…' : formatearMoneda(resumen?.montoTotalVendido ?? 0)}
              />
            </div>

            {resumen && resumen.proyectosPorFase.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Proyectos por fase del funnel
                </h3>
                <div className="flex flex-wrap gap-3">
                  {resumen.proyectosPorFase.map((f) => (
                    <span
                      key={f.faseId}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      {f.nombre}: {f.total}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Selecciona un tipo de reporte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-[#00388d] hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl flex items-center gap-2">
                  <Icono icon={Activity} size={20} className="text-[#00388d]" />
                  Actividad reciente
                </span>
                <button
                  onClick={() => irAReporte('actividad')}
                  className="text-[#00388d] hover:text-blue-900 text-sm font-semibold hover:underline text-left w-fit cursor-pointer flex items-center gap-1"
                >
                  Ver reporte
                  <Icono icon={ArrowRight} size={14} />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-[#00388d] hover:shadow-md transition-all flex flex-col justify-between h-36">
                <span className="text-slate-800 font-semibold text-xl flex items-center gap-2">
                  <Icono icon={FolderKanban} size={20} className="text-[#00388d]" />
                  Proyectos por fecha
                </span>
                <button
                  onClick={() => irAReporte('proyectos')}
                  className="text-[#00388d] hover:text-blue-900 text-sm font-semibold hover:underline text-left w-fit cursor-pointer flex items-center gap-1"
                >
                  Ver reporte
                  <Icono icon={ArrowRight} size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPORTE ACTIVIDAD */}
        {reporteActivo === 'actividad' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            {cargandoActividad ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Icono icon={Loader2} size={16} className="animate-spin" />
                Cargando actividad…
              </div>
            ) : (
              <>
                <DataTable
                  columnas={columnasActividad}
                  filas={datosActividad?.datos ?? []}
                  claveFila={(a) => `${a.tipo}-${a.id}`}
                  vacio="No hay actividad registrada."
                />
                {datosActividad && datosActividad.totalPaginas > 1 && (
                  <Pagination
                    paginaActual={paginaActividad}
                    totalPaginas={datosActividad.totalPaginas}
                    onCambiar={setPaginaActividad}
                    totalRegistros={datosActividad.total}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* REPORTE PROYECTOS */}
        {reporteActivo === 'proyectos' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <form onSubmit={handleGenerarReporteProyectos} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border-b border-slate-300 py-2 text-sm text-slate-700 bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={cargandoProyectos}
                  className="w-full md:w-auto px-6 py-2.5 bg-[#00388d] hover:bg-blue-900 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {cargandoProyectos ? 'Generando…' : 'Generar reporte'}
                </button>
              </div>
            </form>

            {proyectosResultado !== null && (
              <DataTable
                columnas={columnasProyectos}
                filas={proyectosResultado}
                claveFila={(p) => p.id}
                vacio="No se encontraron proyectos en ese rango de fechas."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaResumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{titulo}</p>
      <p className="text-xl font-bold text-[#00388d] mt-1">{valor}</p>
    </div>
  );
}
