'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { ProyectosFiltros, ProyectosTabla } from './components';
import { FaseFunnel, Proyecto } from './types';
import { nombreCompletoContacto } from './utils';

const REGISTROS_POR_PAGINA = 10;

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fases, setFases] = useState<FaseFunnel[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [faseFiltro, setFaseFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(null);

  const cargarProyectos = useCallback(async (fase: string) => {
    setCargando(true);
    try {
      const query = fase ? `?fase=${encodeURIComponent(fase)}` : '';
      const datos = await api.get<Proyecto[]>(`/api/proyectos${query}`);
      setProyectos(datos);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudieron cargar los proyectos.';
      toast.error(mensaje);
      setProyectos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga de fases para poblar el filtro (independiente del listado de proyectos).
  useEffect(() => {
    api
      .get<FaseFunnel[]>('/api/funnel/fases')
      .then(setFases)
      .catch((error) => {
        const mensaje = error instanceof ApiError ? error.message : 'No se pudieron cargar las fases.';
        toast.error(mensaje);
        setFases([]);
      });
  }, []);

  // Recarga el listado cada vez que cambia el filtro de fase (viaja al backend).
  useEffect(() => {
    cargarProyectos(faseFiltro);
    setPaginaActual(1);
  }, [faseFiltro, cargarProyectos]);

  // La búsqueda por texto es local sobre lo que ya devolvió el backend: no
  // hay parámetro `q` documentado para `/api/proyectos`.
  const proyectosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return proyectos;
    return proyectos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        p.codigo.toLowerCase().includes(texto) ||
        nombreCompletoContacto(p.contacto).toLowerCase().includes(texto)
    );
  }, [proyectos, busqueda]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  // Paginación funcional de verdad: se calcula sobre la lista ya filtrada y
  // se corta en cliente, con los botones de `Pagination` navegando de verdad.
  const totalPaginas = Math.max(Math.ceil(proyectosFiltrados.length / REGISTROS_POR_PAGINA), 1);
  const paginaValida = Math.min(paginaActual, totalPaginas);

  const proyectosPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * REGISTROS_POR_PAGINA;
    return proyectosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [proyectosFiltrados, paginaValida]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFaseFiltro('');
  };

  const confirmarEliminar = async () => {
    if (!proyectoAEliminar) return;
    try {
      await api.del(`/api/proyectos/${proyectoAEliminar.id}`);
      toast.success(`Proyecto "${proyectoAEliminar.nombre}" eliminado.`);
      setProyectoAEliminar(null);
      await cargarProyectos(faseFiltro);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo eliminar el proyecto.';
      toast.error(mensaje);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md px-2">Proyectos</h1>

      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
        <ProyectosFiltros
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          fases={fases}
          faseFiltro={faseFiltro}
          onFaseFiltroChange={setFaseFiltro}
          onLimpiar={limpiarFiltros}
          cargando={cargando}
        />

        <ProyectosTabla proyectos={proyectosPaginados} onEliminar={setProyectoAEliminar} />

        <Pagination
          paginaActual={paginaValida}
          totalPaginas={totalPaginas}
          totalRegistros={proyectosFiltrados.length}
          onCambiar={setPaginaActual}
        />
      </div>

      <ConfirmDialog
        abierto={Boolean(proyectoAEliminar)}
        onCerrar={() => setProyectoAEliminar(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar proyecto"
        mensaje={
          proyectoAEliminar
            ? `¿Estás seguro de que deseas eliminar el proyecto "${proyectoAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  );
}
