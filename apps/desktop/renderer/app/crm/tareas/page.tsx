'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, FolderKanban, User, CalendarClock, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icono } from '../../components/Icono';

export interface Tarea {
  id: string;
  proyectoId: string | null;
  contactoId: string | null;
  titulo: string;
  descripcion: string;
  fechaVencimiento: string | null;
  completada: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProyectoResumen {
  id: string;
  codigo: string;
  nombre: string;
}

interface ContactoResumen {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

type FiltroEstado = 'pendientes' | 'completadas' | 'todas';

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  proyectoId: '',
  contactoId: '',
  fechaVencimiento: '',
};

/** Convierte un ISO completo al formato que espera un `<input type="datetime-local">`. */
function isoAInputLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatearFechaVencimiento(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

function nombreCompletoContacto(c: ContactoResumen): string {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');
}

/**
 * Tareas del CRM contra `/api/tareas`. El modelo real no tiene concepto de
 * "tipo de tarea" ni "asesor asignado" (campos que sí existían en el mock):
 * solo título, descripción, vencimiento y relación opcional con proyecto o
 * contacto. Los selectores se pueblan desde `/api/proyectos` y `/api/contactos`.
 */
export default function TareasCRMPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [contactos, setContactos] = useState<ContactoResumen[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('pendientes');
  const [filtroProyecto, setFiltroProyecto] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<Tarea | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const [tareaABorrar, setTareaABorrar] = useState<Tarea | null>(null);
  const [idEnProceso, setIdEnProceso] = useState<string | null>(null);

  // Selectores: se cargan una sola vez, toleran fallo sin tumbar la página.
  useEffect(() => {
    api
      .get<ProyectoResumen[]>('/api/proyectos')
      .then(setProyectos)
      .catch(() => toast.error('No se pudieron cargar los proyectos para los filtros.'));
    api
      .get<ContactoResumen[]>('/api/contactos')
      .then(setContactos)
      .catch(() => toast.error('No se pudieron cargar los contactos para los filtros.'));
  }, []);

  const cargarTareas = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtroProyecto) params.set('proyectoId', filtroProyecto);
    if (filtroEstado !== 'todas') params.set('completada', filtroEstado === 'completadas' ? 'true' : 'false');
    const qs = params.toString();

    try {
      const datos = await api.get<Tarea[]>(`/api/tareas${qs ? `?${qs}` : ''}`);
      setTareas(datos);
      setMensajeError(null);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudieron cargar las tareas.';
      setMensajeError(mensaje);
      setTareas([]);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }, [filtroProyecto, filtroEstado]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  const mapaProyectos = useMemo(() => new Map(proyectos.map((p) => [p.id, p])), [proyectos]);
  const mapaContactos = useMemo(() => new Map(contactos.map((c) => [c.id, c])), [contactos]);

  const tareasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();
    if (!texto) return tareas;
    return tareas.filter(
      (t) => t.titulo.toLowerCase().includes(texto) || t.descripcion.toLowerCase().includes(texto)
    );
  }, [tareas, busqueda]);

  const resetForm = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
  };

  const handleAbrirNueva = () => {
    resetForm();
    setModalAbierto(true);
  };

  const handleAbrirEditar = (t: Tarea) => {
    setEditando(t);
    setForm({
      titulo: t.titulo,
      descripcion: t.descripcion,
      proyectoId: t.proyectoId ?? '',
      contactoId: t.contactoId ?? '',
      fechaVencimiento: isoAInputLocal(t.fechaVencimiento),
    });
    setModalAbierto(true);
  };

  const handleGuardar = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!form.titulo.trim()) {
      toast.error('El título es obligatorio.');
      return;
    }

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion,
      ...(form.proyectoId ? { proyectoId: form.proyectoId } : {}),
      ...(form.contactoId ? { contactoId: form.contactoId } : {}),
      fechaVencimiento: form.fechaVencimiento ? new Date(form.fechaVencimiento).toISOString() : null,
    };

    setGuardando(true);
    try {
      if (editando) {
        await api.patch(`/api/tareas/${editando.id}`, payload);
        toast.success('Tarea actualizada.');
      } else {
        await api.post('/api/tareas', payload);
        toast.success('Tarea creada.');
      }
      setModalAbierto(false);
      resetForm();
      await cargarTareas();
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo guardar la tarea.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleCompletada = async (t: Tarea) => {
    if (idEnProceso) return;
    setIdEnProceso(t.id);
    try {
      const actualizada = await api.patch<Tarea>(`/api/tareas/${t.id}`, { completada: !t.completada });
      setTareas((prev) => prev.map((x) => (x.id === t.id ? actualizada : x)));
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo actualizar la tarea.';
      toast.error(mensaje);
    } finally {
      setIdEnProceso(null);
    }
  };

  const handleBorrar = async () => {
    if (!tareaABorrar) return;
    try {
      await api.del(`/api/tareas/${tareaABorrar.id}`);
      setTareas((prev) => prev.filter((x) => x.id !== tareaABorrar.id));
      toast.success('Tarea eliminada.');
      setTareaABorrar(null);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo eliminar la tarea.';
      toast.error(mensaje);
    }
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">Tareas del CRM</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-1/2 space-y-1">
              <label className="text-xs text-gray-400 font-medium">Buscar</label>
              <input
                type="text"
                placeholder="Texto de búsqueda..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border-b border-gray-200 py-1.5 text-sm text-gray-600 focus:outline-none focus:border-[#2dd4bf] transition-colors"
              />
            </div>

            <button
              onClick={handleAbrirNueva}
              className="bg-[#2dd4bf] hover:bg-teal-600 text-white px-7 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer self-end md:self-auto flex items-center gap-2"
            >
              <Icono icon={Plus} size={14} />
              Nueva tarea
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              className="border-b border-gray-200 py-1 text-sm font-semibold text-gray-600 bg-transparent focus:outline-none cursor-pointer pr-4"
            >
              <option value="pendientes">Tareas pendientes</option>
              <option value="completadas">Tareas completadas</option>
              <option value="todas">Todas las tareas</option>
            </select>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-semibold">Proyecto:</span>
              <select
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="border border-[#2dd4bf] rounded-lg px-3 py-1 text-xs text-[#128f82] font-semibold bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Icono icon={Loader2} size={16} className="animate-spin" />
              Cargando tareas…
            </div>
          ) : tareasFiltradas.length > 0 ? (
            <div className="space-y-3 pt-4">
              {tareasFiltradas.map((t) => {
                const proyecto = t.proyectoId ? mapaProyectos.get(t.proyectoId) : undefined;
                const contacto = t.contactoId ? mapaContactos.get(t.contactoId) : undefined;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      t.completada
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-slate-50/60 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={t.completada}
                        disabled={idEnProceso === t.id}
                        onChange={() => handleToggleCompletada(t)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2dd4bf] focus:ring-[#2dd4bf] cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <Icono icon={CalendarClock} size={12} />
                            {formatearFechaVencimiento(t.fechaVencimiento)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(t)}
                          className={`text-xs text-left text-gray-700 font-medium hover:underline cursor-pointer ${
                            t.completada ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {t.titulo}
                        </button>
                        {t.descripcion && <p className="text-[11px] text-gray-400">{t.descripcion}</p>}
                        <div className="text-[11px] text-gray-400 gap-3 flex flex-wrap">
                          {contacto && (
                            <span className="inline-flex items-center gap-1">
                              <Icono icon={User} size={11} />
                              {nombreCompletoContacto(contacto)}
                            </span>
                          )}
                          {proyecto && (
                            <span className="inline-flex items-center gap-1">
                              <Icono icon={FolderKanban} size={11} />
                              {proyecto.nombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setTareaABorrar(t)}
                      className="text-[#ef4444] hover:text-red-700 cursor-pointer self-end md:self-auto"
                      title="Eliminar tarea"
                    >
                      <Icono icon={Trash2} size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-gray-400 font-medium">
              {mensajeError ?? 'No hay tareas que coincidan con los filtros seleccionados.'}
            </div>
          )}
        </div>
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={editando ? 'Editar tarea' : 'Nueva tarea'}
        tamano="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-tarea"
              disabled={guardando}
              className="bg-[#2dd4bf] hover:bg-teal-600 text-white px-8 py-2.5 rounded-full font-semibold shadow-md transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="form-tarea" onSubmit={handleGuardar} className="space-y-5 text-xs text-gray-500">
          <div>
            <label className="block text-gray-400 mb-1">Título</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full border-b border-gray-300 py-1.5 font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <label className="block text-gray-400 mb-1">Proyecto</label>
              <select
                value={form.proyectoId}
                onChange={(e) => setForm((prev) => ({ ...prev, proyectoId: e.target.value }))}
                className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
              >
                <option value="">---------</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Contacto</label>
              <select
                value={form.contactoId}
                onChange={(e) => setForm((prev) => ({ ...prev, contactoId: e.target.value }))}
                className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
              >
                <option value="">---------</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nombreCompletoContacto(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Fecha de vencimiento</label>
            <input
              type="datetime-local"
              value={form.fechaVencimiento}
              onChange={(e) => setForm((prev) => ({ ...prev, fechaVencimiento: e.target.value }))}
              className="w-full border-b border-gray-300 py-1.5 text-gray-600 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        abierto={tareaABorrar !== null}
        onCerrar={() => setTareaABorrar(null)}
        onConfirmar={handleBorrar}
        titulo="Eliminar tarea"
        mensaje={`¿Estás seguro de eliminar la tarea "${tareaABorrar?.titulo ?? ''}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  );
}
