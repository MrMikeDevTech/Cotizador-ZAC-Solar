'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  ListChecks,
  Briefcase,
  CalendarX,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Modal } from '../../components/Modal';
import { Icono } from '../../components/Icono';

export type VistaCalendario = 'mes' | 'semana' | 'dia' | 'agenda-semana' | 'agenda-mes';
export type TipoAgenda = 'evento' | 'tarea' | 'proyecto';

/** Item unificado tal como lo devuelve `GET /api/agenda`. */
interface ItemAgenda {
  id: string;
  tipo: TipoAgenda;
  titulo: string;
  inicio: string;
  fin: string | null;
  proyectoId: string | null;
  contactoId: string | null;
  completada: boolean | null;
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

const DIAS_SEMANA = ['LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.', 'DOM.'];
const DIAS_SEMANA_COMPLETO = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const HORAS_DIA = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 a 20:00

const ESTILO_TIPO: Record<TipoAgenda, { color: string; clasesBadge: string; icono: LucideIcon; etiqueta: string }> = {
  evento: { color: '#2dd4bf', clasesBadge: 'bg-[#2dd4bf]/15 text-[#0f766e]', icono: CalendarDays, etiqueta: 'Evento' },
  tarea: { color: '#f7931e', clasesBadge: 'bg-[#f7931e]/15 text-[#9a5a0a]', icono: ListChecks, etiqueta: 'Tarea' },
  proyecto: { color: '#00388d', clasesBadge: 'bg-[#00388d]/10 text-[#00388d]', icono: Briefcase, etiqueta: 'Proyecto' },
};

function nombreDia(indice: number, completo = false): string {
  return (completo ? DIAS_SEMANA_COMPLETO[indice] : DIAS_SEMANA[indice]) ?? '';
}

function nombreMes(indice: number): string {
  return MESES[indice] ?? '';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clave local `YYYY-MM-DD`, usada para agrupar eventos por día sin problemas de zona horaria. */
function claveDia(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function esMismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getInicioSemana(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dia = (date.getDay() + 6) % 7; // 0 = lunes
  date.setDate(date.getDate() - dia);
  return date;
}

function formatearHora(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatearFechaLarga(d: Date): string {
  return `${nombreDia((d.getDay() + 6) % 7, true)} ${d.getDate()} de ${nombreMes(d.getMonth())}`;
}

function obtenerHoraLocal(iso: string): number {
  return new Date(iso).getHours();
}

/** Los proyectos (creados en cualquier momento del día) y los horarios fuera de 6–20h van al renglón "todo el día". */
function vaEnBucketTodoElDia(item: ItemAgenda): boolean {
  if (item.tipo === 'proyecto') return true;
  const hora = obtenerHoraLocal(item.inicio);
  return hora < 6 || hora > 20;
}

function construirCeldasMes(fechaRef: Date): { fecha: Date; esMesActual: boolean }[] {
  const year = fechaRef.getFullYear();
  const month = fechaRef.getMonth();
  const primerDiaMes = new Date(year, month, 1);
  const diaInicioSemana = (primerDiaMes.getDay() + 6) % 7;
  const inicioGrid = new Date(year, month, 1 - diaInicioSemana);
  const ultimoDiaMes = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDiaMes.getDate();
  const totalCeldas = diaInicioSemana + diasEnMes > 35 ? 42 : 35;

  return Array.from({ length: totalCeldas }, (_, i) => {
    const fecha = new Date(inicioGrid);
    fecha.setDate(inicioGrid.getDate() + i);
    return { fecha, esMesActual: fecha.getMonth() === month };
  });
}

/** Rango de fechas (inclusivo) que hay que pedirle a `/api/agenda` para alimentar la vista activa. */
function getRangoVista(vista: VistaCalendario, fechaActual: Date): { desde: Date; hasta: Date } {
  if (vista === 'mes' || vista === 'agenda-mes') {
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    const primerDiaMes = new Date(year, month, 1);
    const diaInicioSemana = (primerDiaMes.getDay() + 6) % 7;
    const inicioGrid = new Date(year, month, 1 - diaInicioSemana);
    const ultimoDiaMes = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDiaMes.getDate();
    const totalCeldas = diaInicioSemana + diasEnMes > 35 ? 42 : 35;
    const hasta = new Date(inicioGrid);
    hasta.setDate(inicioGrid.getDate() + totalCeldas - 1);
    hasta.setHours(23, 59, 59, 999);
    return { desde: inicioGrid, hasta };
  }
  if (vista === 'semana' || vista === 'agenda-semana') {
    const desde = getInicioSemana(fechaActual);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 6);
    hasta.setHours(23, 59, 59, 999);
    return { desde, hasta };
  }
  const desde = new Date(fechaActual);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(fechaActual);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

const FORM_EVENTO_INICIAL = {
  titulo: '',
  descripcion: '',
  inicio: '',
  fin: '',
  todoElDia: false,
  proyectoId: '',
  contactoId: '',
};

function fechaAInputLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarioCRMPage() {
  const [fechaActual, setFechaActual] = useState<Date>(() => new Date());
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [eventos, setEventos] = useState<ItemAgenda[]>([]);
  const [cargando, setCargando] = useState(true);

  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [contactos, setContactos] = useState<ContactoResumen[]>([]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formEvento, setFormEvento] = useState(FORM_EVENTO_INICIAL);

  useEffect(() => {
    api
      .get<ProyectoResumen[]>('/api/proyectos')
      .then(setProyectos)
      .catch(() => toast.error('No se pudieron cargar los proyectos para el formulario de evento.'));
    api
      .get<ContactoResumen[]>('/api/contactos')
      .then(setContactos)
      .catch(() => toast.error('No se pudieron cargar los contactos para el formulario de evento.'));
  }, []);

  const cargarAgenda = useCallback(async () => {
    setCargando(true);
    const { desde, hasta } = getRangoVista(vista, fechaActual);
    try {
      const datos = await api.get<ItemAgenda[]>(
        `/api/agenda?desde=${encodeURIComponent(desde.toISOString())}&hasta=${encodeURIComponent(hasta.toISOString())}`
      );
      setEventos(datos);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo cargar la agenda.';
      toast.error(mensaje);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  }, [vista, fechaActual]);

  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, ItemAgenda[]>();
    for (const item of eventos) {
      const clave = claveDia(new Date(item.inicio));
      const lista = mapa.get(clave) ?? [];
      lista.push(item);
      mapa.set(clave, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
    return mapa;
  }, [eventos]);

  const gruposAgenda = useMemo(() => {
    return Array.from(eventosPorDia.entries())
      .map(([clave, items]) => ({ clave, fecha: new Date(items[0]?.inicio ?? clave), items }))
      .sort((a, b) => a.clave.localeCompare(b.clave));
  }, [eventosPorDia]);

  const navegar = (direccion: 'prev' | 'next') => {
    const nueva = new Date(fechaActual);
    if (vista === 'mes' || vista === 'agenda-mes') {
      nueva.setMonth(nueva.getMonth() + (direccion === 'next' ? 1 : -1));
    } else if (vista === 'semana' || vista === 'agenda-semana') {
      nueva.setDate(nueva.getDate() + (direccion === 'next' ? 7 : -7));
    } else {
      nueva.setDate(nueva.getDate() + (direccion === 'next' ? 1 : -1));
    }
    setFechaActual(nueva);
  };

  const irAHoy = () => setFechaActual(new Date());

  const inicioSemana = getInicioSemana(fechaActual);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);

  const getTituloEncabezado = () => {
    const mesNombre = nombreMes(fechaActual.getMonth());
    const anio = fechaActual.getFullYear();
    if (vista === 'mes' || vista === 'agenda-mes') return `${mesNombre} ${anio}`;
    if (vista === 'semana' || vista === 'agenda-semana') {
      const mesInicio = nombreMes(inicioSemana.getMonth()).slice(0, 3);
      const mesFin = nombreMes(finSemana.getMonth()).slice(0, 3);
      return `${inicioSemana.getDate()} de ${mesInicio}. – ${finSemana.getDate()} de ${mesFin}. de ${anio}`;
    }
    return `${fechaActual.getDate()} de ${mesNombre} de ${anio}`;
  };

  const handleAbrirNuevoEvento = () => {
    setFormEvento({ ...FORM_EVENTO_INICIAL, inicio: fechaAInputLocal(new Date()) });
    setModalAbierto(true);
  };

  const handleCrearEvento = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!formEvento.titulo.trim() || !formEvento.inicio) {
      toast.error('Título e inicio son obligatorios.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/api/agenda', {
        titulo: formEvento.titulo.trim(),
        descripcion: formEvento.descripcion,
        inicio: new Date(formEvento.inicio).toISOString(),
        fin: formEvento.fin ? new Date(formEvento.fin).toISOString() : null,
        todoElDia: formEvento.todoElDia,
        ...(formEvento.proyectoId ? { proyectoId: formEvento.proyectoId } : {}),
        ...(formEvento.contactoId ? { contactoId: formEvento.contactoId } : {}),
      });
      toast.success('Evento creado.');
      setModalAbierto(false);
      setFormEvento(FORM_EVENTO_INICIAL);
      await cargarAgenda();
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo crear el evento.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const hoy = new Date();

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">Calendario (CRM)</h1>
          <button
            onClick={handleAbrirNuevoEvento}
            className="bg-[#2dd4bf] hover:bg-teal-600 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Icono icon={Plus} size={14} />
            <span className="hidden sm:inline">Nuevo evento</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          {/* LEYENDA DE TIPOS */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600 font-medium pb-2">
            {(Object.keys(ESTILO_TIPO) as TipoAgenda[]).map((tipo) => (
              <div key={tipo} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ESTILO_TIPO[tipo].color }} />
                <span>{ESTILO_TIPO[tipo].etiqueta}</span>
              </div>
            ))}
          </div>

          {/* BARRA DE NAVEGACIÓN Y VISTAS */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navegar('prev')}
                aria-label="Período anterior"
                className="px-3 py-1 border border-[#2dd4bf] text-[#2dd4bf] rounded-lg text-xs font-bold hover:bg-[#2dd4bf]/10 transition-colors"
              >
                <Icono icon={ChevronLeft} size={14} />
              </button>
              <button
                onClick={() => navegar('next')}
                aria-label="Período siguiente"
                className="px-3 py-1 border border-[#2dd4bf] text-[#2dd4bf] rounded-lg text-xs font-bold hover:bg-[#2dd4bf]/10 transition-colors"
              >
                <Icono icon={ChevronRight} size={14} />
              </button>
              <button
                onClick={irAHoy}
                className="px-4 py-1 bg-[#2dd4bf]/20 border border-[#2dd4bf] text-[#0f766e] rounded-lg text-xs font-semibold hover:bg-[#2dd4bf]/30 transition-colors"
              >
                Hoy
              </button>
            </div>

            <h2 className="text-base font-semibold text-gray-600 capitalize">{getTituloEncabezado()}</h2>

            <div className="flex items-center gap-1 flex-wrap justify-center">
              {(
                [
                  ['mes', 'Mes'],
                  ['semana', 'Semana'],
                  ['dia', 'Día'],
                  ['agenda-semana', 'Agenda (semana)'],
                  ['agenda-mes', 'Agenda (mes)'],
                ] as [VistaCalendario, string][]
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  onClick={() => setVista(valor)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    vista === valor
                      ? 'bg-[#2dd4bf] text-white'
                      : 'border border-[#2dd4bf] text-[#2dd4bf] hover:bg-[#2dd4bf]/10'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {cargando && (
            <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Icono icon={Loader2} size={16} className="animate-spin" />
              Cargando agenda…
            </div>
          )}

          {/* VISTA MES */}
          {!cargando && vista === 'mes' && (
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 bg-white text-center text-xs font-semibold text-gray-400 border-b border-gray-200 py-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia}>{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-white">
                  {construirCeldasMes(fechaActual).map((celda) => {
                    const clave = claveDia(celda.fecha);
                    const itemsDia = eventosPorDia.get(clave) ?? [];
                    const destacado = celda.esMesActual && esMismoDia(celda.fecha, hoy);
                    return (
                      <div
                        key={clave}
                        className={`h-24 p-1.5 flex flex-col gap-1 overflow-hidden ${
                          !celda.esMesActual ? 'bg-slate-50/50 text-gray-300' : 'text-gray-600'
                        } ${destacado ? 'bg-blue-50/30' : ''}`}
                      >
                        <span
                          className={`self-end text-xs font-medium ${
                            destacado
                              ? 'bg-[#2dd4bf] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm'
                              : ''
                          }`}
                        >
                          {celda.fecha.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {itemsDia.slice(0, 2).map((item) => (
                            <span
                              key={`${item.tipo}-${item.id}`}
                              className={`text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-1 ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                            >
                              <Icono icon={ESTILO_TIPO[item.tipo].icono} size={9} />
                              <span className="truncate">{item.titulo}</span>
                            </span>
                          ))}
                          {itemsDia.length > 2 && (
                            <span className="text-[9px] text-gray-400 font-semibold">+{itemsDia.length - 2} más</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VISTA SEMANA */}
          {!cargando && vista === 'semana' && (
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-8 bg-white border-b border-gray-200 text-center text-xs font-semibold text-gray-500 divide-x divide-gray-200">
                  <div className="py-2 text-[10px] text-gray-400">Todo el día</div>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(inicioSemana);
                    d.setDate(d.getDate() + i);
                    return (
                      <div key={claveDia(d)} className="py-2">
                        {nombreDia(i)} {d.getDate()}/{d.getMonth() + 1}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-8 divide-x divide-gray-100 min-h-[36px] bg-slate-50/30">
                  <div className="text-[11px] text-gray-400 font-medium text-right pr-3 pt-1">—</div>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(inicioSemana);
                    d.setDate(d.getDate() + i);
                    const itemsTodoDia = (eventosPorDia.get(claveDia(d)) ?? []).filter(vaEnBucketTodoElDia);
                    return (
                      <div key={claveDia(d)} className="p-1 flex flex-col gap-0.5 overflow-hidden">
                        {itemsTodoDia.slice(0, 2).map((item) => (
                          <span
                            key={`${item.tipo}-${item.id}`}
                            className={`text-[9px] px-1 py-0.5 rounded truncate ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                          >
                            {item.titulo}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">
                  {HORAS_DIA.map((hora) => (
                    <div key={hora} className="grid grid-cols-8 divide-x divide-gray-100 min-h-[38px]">
                      <div className="text-[11px] text-gray-400 font-medium text-right pr-3 pt-1 bg-slate-50/30">{hora}</div>
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(inicioSemana);
                        d.setDate(d.getDate() + i);
                        const itemsHora = (eventosPorDia.get(claveDia(d)) ?? []).filter(
                          (item) => !vaEnBucketTodoElDia(item) && obtenerHoraLocal(item.inicio) === hora
                        );
                        return (
                          <div key={claveDia(d)} className="hover:bg-blue-50/20 transition-colors p-0.5 flex flex-col gap-0.5">
                            {itemsHora.map((item) => (
                              <span
                                key={`${item.tipo}-${item.id}`}
                                className={`text-[9px] px-1 rounded truncate ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                              >
                                {item.titulo}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VISTA DÍA */}
          {!cargando && vista === 'dia' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 text-center py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                {nombreDia((fechaActual.getDay() + 6) % 7, true)}
              </div>
              <div className="flex min-h-[36px] bg-slate-50/30 border-b border-gray-100">
                <div className="w-16 shrink-0 text-[11px] text-gray-400 font-medium text-right pr-3 pt-1">Todo el día</div>
                <div className="flex-1 p-1 flex flex-wrap gap-1">
                  {(eventosPorDia.get(claveDia(fechaActual)) ?? [])
                    .filter(vaEnBucketTodoElDia)
                    .map((item) => (
                      <span
                        key={`${item.tipo}-${item.id}`}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                      >
                        <Icono icon={ESTILO_TIPO[item.tipo].icono} size={10} />
                        {item.titulo}
                      </span>
                    ))}
                </div>
              </div>
              <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">
                {HORAS_DIA.map((hora) => {
                  const itemsHora = (eventosPorDia.get(claveDia(fechaActual)) ?? []).filter(
                    (item) => !vaEnBucketTodoElDia(item) && obtenerHoraLocal(item.inicio) === hora
                  );
                  return (
                    <div key={hora} className="flex min-h-[38px]">
                      <div className="w-16 shrink-0 text-[11px] text-gray-400 font-medium text-right pr-3 pt-1">{hora}</div>
                      <div className="flex-1 hover:bg-blue-50/20 transition-colors p-1 flex flex-col gap-1">
                        {itemsHora.map((item) => (
                          <span
                            key={`${item.tipo}-${item.id}`}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 w-fit ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                          >
                            <Icono icon={ESTILO_TIPO[item.tipo].icono} size={10} />
                            {formatearHora(item.inicio)} · {item.titulo}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTAS AGENDA: lista real de eventos, nunca "vacía siempre" */}
          {!cargando && (vista === 'agenda-semana' || vista === 'agenda-mes') && (
            <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[200px]">
              {gruposAgenda.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-xs text-gray-400 italic gap-2">
                  <Icono icon={CalendarX} size={28} className="text-gray-300" />
                  Agenda vacía para este período
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {gruposAgenda.map((grupo) => (
                    <div key={grupo.clave} className="p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        {formatearFechaLarga(grupo.fecha)}
                        {esMismoDia(grupo.fecha, hoy) && <span className="text-[#2dd4bf]">(Hoy)</span>}
                      </p>
                      <div className="space-y-1.5">
                        {grupo.items.map((item) => (
                          <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-2 text-xs flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${ESTILO_TIPO[item.tipo].clasesBadge}`}
                            >
                              <Icono icon={ESTILO_TIPO[item.tipo].icono} size={12} />
                              {ESTILO_TIPO[item.tipo].etiqueta}
                            </span>
                            <span className="text-gray-400">{formatearHora(item.inicio)}</span>
                            <span
                              className={`text-gray-700 font-medium ${item.completada ? 'line-through text-gray-400' : ''}`}
                            >
                              {item.titulo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Nuevo evento"
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
              form="form-nuevo-evento"
              disabled={guardando}
              className="bg-[#2dd4bf] hover:bg-teal-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-md transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando…' : 'Guardar evento'}
            </button>
          </>
        }
      >
        <form id="form-nuevo-evento" onSubmit={handleCrearEvento} className="space-y-4 text-xs text-gray-500">
          <div>
            <label className="block text-gray-400 mb-1">Título</label>
            <input
              type="text"
              required
              value={formEvento.titulo}
              onChange={(e) => setFormEvento((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full border-b border-gray-300 py-1.5 font-bold text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Descripción</label>
            <textarea
              rows={2}
              value={formEvento.descripcion}
              onChange={(e) => setFormEvento((prev) => ({ ...prev, descripcion: e.target.value }))}
              className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-1">Inicio</label>
              <input
                type="datetime-local"
                required
                value={formEvento.inicio}
                onChange={(e) => setFormEvento((prev) => ({ ...prev, inicio: e.target.value }))}
                className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Fin (opcional)</label>
              <input
                type="datetime-local"
                value={formEvento.fin}
                onChange={(e) => setFormEvento((prev) => ({ ...prev, fin: e.target.value }))}
                className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-600 font-medium">
            <input
              type="checkbox"
              checked={formEvento.todoElDia}
              onChange={(e) => setFormEvento((prev) => ({ ...prev, todoElDia: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[#2dd4bf] focus:ring-[#2dd4bf] cursor-pointer"
            />
            Todo el día
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-1">Proyecto relacionado</label>
              <select
                value={formEvento.proyectoId}
                onChange={(e) => setFormEvento((prev) => ({ ...prev, proyectoId: e.target.value }))}
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
              <label className="block text-gray-400 mb-1">Contacto relacionado</label>
              <select
                value={formEvento.contactoId}
                onChange={(e) => setFormEvento((prev) => ({ ...prev, contactoId: e.target.value }))}
                className="w-full border-b border-gray-300 py-1.5 text-gray-700 bg-transparent focus:outline-none focus:border-[#2dd4bf]"
              >
                <option value="">---------</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
