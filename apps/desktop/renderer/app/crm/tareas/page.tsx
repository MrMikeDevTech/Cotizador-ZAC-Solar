'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export type TipoTarea =
  | 'Llamada'
  | 'Correo'
  | 'Cita'
  | 'Cotización'
  | 'Otra'
  | 'Presentación Cliente'
  | 'Visita Técnica'
  | 'Instalación';

export interface Tarea {
  id: string | number;
  tipo: TipoTarea;
  asesor: string;
  contacto: string;
  proyecto: string;
  fechaVencimiento: string;
  hora: string;
  minutos: string;
  ampm: 'AM' | 'PM';
  descripcion: string;
  completada: boolean;
}

const tiposTareaLista: TipoTarea[] = [
  'Llamada',
  'Correo',
  'Cita',
  'Cotización',
  'Otra',
  'Presentación Cliente',
  'Visita Técnica',
  'Instalación',
];

const asesoresLista = [
  'Miguel Angel Martinez - ADMINISTRADOR',
  'Jessica Robles - GERENTE',
  'Carlos Eduardo Peña - VENDEDOR',
];

const contactosLista = [
  'Rosalva Espinoza López',
  'América Judith Romero',
  'Gerardo Núñez Cuevas',
  'Sr. J. Manuel',
  'Marcia Chávez Nungaray',
];

const proyectosLista = [
  'Residencial Espinoza',
  'Comercial Romero',
  'Proyecto Núñez',
  'Bodega J. Manuel',
  'Sistema Solar 10kW',
];

const tareasIniciales: Tarea[] = [
  {
    id: '1',
    tipo: 'Llamada',
    asesor: 'Miguel Angel Martinez - ADMINISTRADOR',
    contacto: 'Rosalva Espinoza López',
    proyecto: 'Residencial Espinoza',
    fechaVencimiento: '2026-09-20',
    hora: '11',
    minutos: '00',
    ampm: 'AM',
    descripcion: 'Llamada de seguimiento para confirmación de propuesta económica.',
    completada: false,
  },
  {
    id: '2',
    tipo: 'Visita Técnica',
    asesor: 'Miguel Angel Martinez - ADMINISTRADOR',
    contacto: 'Gerardo Núñez Cuevas',
    proyecto: 'Proyecto Núñez',
    fechaVencimiento: '2026-09-22',
    hora: '04',
    minutos: '30',
    ampm: 'PM',
    descripcion: 'Revisión técnica de trayectoria de cableado e inversor.',
    completada: false,
  },
];

export default function TareasCRMPage() {
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'incompletas' | 'completadas' | 'todas'>('incompletas');
  const [filtroAsesor, setFiltroAsesor] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario Nueva Tarea
  const [tipo, setTipo] = useState<TipoTarea>('Llamada');
  const [asesor, setAsesor] = useState(asesoresLista[0]);
  const [contacto, setContacto] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [hora, setHora] = useState('11');
  const [minutos, setMinutos] = useState('0');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    api
      .get<Tarea[]>('/api/crm/tareas')
      .then((data) => {
        if (data && data.length > 0) setTareas(data);
      })
      .catch(() => {
        // Se mantiene estado local si la API aún no está disponible
      });
  }, []);

  const handleCrearTarea = (e: React.FormEvent) => {
    e.preventDefault();

    const nuevaTarea: Tarea = {
      id: Date.now().toString(),
      tipo,
      asesor,
      contacto: contacto || '----------',
      proyecto: proyecto || '----------',
      fechaVencimiento,
      hora: hora || '12',
      minutos: minutos || '00',
      ampm,
      descripcion,
      completada: false,
    };

    setTareas((prev) => [nuevaTarea, ...prev]);

    api.post('/api/crm/tareas', nuevaTarea).catch(() => {});

    // Limpiar formulario y cerrar modal
    setTipo('Llamada');
    setContacto('');
    setProyecto('');
    setFechaVencimiento('');
    setHora('11');
    setMinutos('0');
    setAmpm('AM');
    setDescripcion('');
    setModalAbierto(false);
  };

  const toggleCompletada = (id: string | number) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t))
    );
  };

  // Filtrado de tareas
  const tareasFiltradas = tareas.filter((t) => {
    const coincideBusqueda =
      t.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.contacto.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.proyecto.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado =
      filtroEstado === 'todas'
        ? true
        : filtroEstado === 'incompletas'
        ? !t.completada
        : t.completada;

    const coincideAsesor =
      filtroAsesor === 'todos' ? true : t.asesor === filtroAsesor;

    return coincideBusqueda && coincideEstado && coincideAsesor;
  });

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ENCABEZADO */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
            Tareas creadas o asignadas a todos
          </h1>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-8">

          {/* BARRA SUPERIOR Y BUSCADOR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-1/2 space-y-1">
              <label className="text-xs text-gray-400 font-medium">Buscar</label>
              <input
                type="text"
                placeholder="Texto de búsqueda..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border-b border-gray-200 py-1.5 text-sm text-gray-600 focus:outline-none focus:border-[#1ac2c2] transition-colors"
              />
            </div>

            <button
              onClick={() => setModalAbierto(true)}
              className="bg-[#1ac2c2] hover:bg-[#15a3a3] text-white px-7 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer self-end md:self-auto"
            >
              Nueva tarea
            </button>
          </div>

          {/* FILTROS SECUNDARIOS */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(e.target.value as 'incompletas' | 'completadas' | 'todas')
                }
                className="border-b border-gray-200 py-1 text-sm font-semibold text-gray-600 bg-transparent focus:outline-none cursor-pointer pr-4"
              >
                <option value="incompletas">Tareas incompletas</option>
                <option value="completadas font-semibold">Tareas completadas</option>
                <option value="todas">Todas las tareas</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-semibold">Seleccionar tareas de:</span>
              <select
                value={filtroAsesor}
                onChange={(e) => setFiltroAsesor(e.target.value)}
                className="border border-[#1ac2c2] rounded-lg px-3 py-1 text-xs text-[#1ac2c2] font-semibold bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los asesores</option>
                {asesoresLista.map((a) => (
                  <option key={a} value={a}>
                    {a.split(' - ')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VISTA DE TAREAS O ESTADO VACÍO */}
          {tareasFiltradas.length > 0 ? (
            <div className="space-y-3 pt-4">
              {tareasFiltradas.map((t) => (
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
                      onChange={() => toggleCompletada(t.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1ac2c2] focus:ring-[#1ac2c2] cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#1ac2c2]/10 text-[#128a8a]">
                          {t.tipo}
                        </span>
                        <span className="text-xs text-gray-400">
                          Vence: {t.fechaVencimiento || 'Sin fecha'} {t.hora}:{t.minutos.padStart(2, '0')} {t.ampm}
                        </span>
                      </div>
                      <p
                        className={`text-xs text-gray-700 font-medium ${
                          t.completada ? 'line-through text-gray-400' : ''
                        }`}
                      >
                        {t.descripcion || 'Sin descripción'}
                      </p>
                      <div className="text-[11px] text-gray-400 gap-3 flex flex-wrap">
                        <span>Contacto: <strong className="text-gray-600">{t.contacto}</strong></span>
                        <span>•</span>
                        <span>Proyecto: <strong className="text-gray-600">{t.proyecto}</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full whitespace-nowrap self-end md:self-auto">
                    {t.asesor.split(' - ')[0]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-gray-400 font-medium">
              Lo sentimos, no hemos encontrado coincidencias bajo ese criterio
            </div>
          )}

        </div>
      </div>

      {/* MODAL NUEVA TAREA */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative">
            
            {/* BOTÓN CERRAR */}
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* ENCABEZADO MODAL */}
            <div className="flex items-center gap-1.5 mb-6">
              <h3 className="text-lg font-bold text-gray-600">Nueva Tarea</h3>
              <span className="text-gray-400 cursor-help text-xs" title="Ayuda sobre tareas">
                ?
              </span>
            </div>

            <form onSubmit={handleCrearTarea} className="space-y-6 text-xs text-gray-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-gray-400 mb-1">Tipo de tarea</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoTarea)}
                      className="w-full border-b border-gray-300 py-1.5 font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                    >
                      {tiposTareaLista.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Asesor</label>
                    <select
                      value={asesor}
                      onChange={(e) => setAsesor(e.target.value)}
                      className="w-full border-b border-gray-300 py-1.5 font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                    >
                      {asesoresLista.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-600 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Descripción</label>
                    <textarea
                      rows={2}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2] resize-none"
                    />
                  </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-gray-400 mb-1">Contacto</label>
                    <select
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                    >
                      <option value="">---------</option>
                      {contactosLista.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Proyecto</label>
                    <select
                      value={proyecto}
                      onChange={(e) => setProyecto(e.target.value)}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                    >
                      <option value="">---------</option>
                      {proyectosLista.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* HORARIO */}
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-gray-400 mb-1">Hora</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={hora}
                          onChange={(e) => setHora(e.target.value)}
                          className="w-full border-b border-gray-300 py-1.5 text-center font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Minutos</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minutos}
                          onChange={(e) => setMinutos(e.target.value)}
                          className="w-full border-b border-gray-300 py-1.5 text-center font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">&nbsp;</label>
                        <select
                          value={ampm}
                          onChange={(e) => setAmpm(e.target.value as 'AM' | 'PM')}
                          className="w-full border-b border-gray-300 py-1.5 font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#1ac2c2]"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACCIONES PIE DE MODAL */}
              <div className="flex justify-end items-center gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1ac2c2] hover:bg-[#15a3a3] text-white px-8 py-2.5 rounded-full font-semibold shadow-md transition-all"
                >
                  Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}