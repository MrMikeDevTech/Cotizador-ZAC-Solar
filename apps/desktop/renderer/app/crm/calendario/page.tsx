'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export type VistaCalendario = 'mes' | 'semana' | 'dia' | 'agenda-semana' | 'agenda-mes';

interface EventoCalendario {
  id: string | number;
  titulo: string;
  categoria: 'tus-tareas' | 'operacion' | 'ventas' | 'administracion';
  fecha: string; // YYYY-MM-DD
  hora?: string;
}

const DIAS_SEMANA = ['LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.', 'DOM.'];
const DIAS_SEMANA_COMPLETO = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const HORAS_DIA = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 a 20:00

export default function CalendarioCRMPage() {
  const [fechaActual, setFechaActual] = useState<Date>(new Date(2026, 8, 16)); // 16 de Sep 2026 por defecto
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);

  useEffect(() => {
    api
      .get<EventoCalendario[]>('/api/crm/calendario')
      .then((data) => {
        if (data && data.length > 0) setEventos(data);
      })
      .catch(() => {
        // Mantiene la lista si la API está en desarrollo
      });
  }, []);

  // Navegación de Fechas
  const navegar = (direccion: 'prev' | 'next') => {
    const nueva = new Date(fechaActual);
    if (vista === 'mes' || vista === 'agenda-mes') {
      nueva.setMonth(nueva.getMonth() + (direccion === 'next' ? 1 : -1));
    } else if (vista === 'semana' || vista === 'agenda-semana') {
      nueva.setDate(nueva.getDate() + (direccion === 'next' ? 7 : -7));
    } else if (vista === 'dia') {
      nueva.setDate(nueva.getDate() + (direccion === 'next' ? 1 : -1));
    }
    setFechaActual(nueva);
  };

  const irAHoy = () => setFechaActual(new Date(2026, 8, 16));

  // Generación de días para vista MES
  const getDiasMesGrid = () => {
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    let diaInicioSemana = (primerDiaMes.getDay() + 6) % 7; // 0 = Lunes
    const diasEnMes = ultimoDiaMes.getDate();
    const diasMesAnterior = new Date(year, month, 0).getDate();

    const celdas = [];

    // Días del mes anterior
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      celdas.push({
        numero: diasMesAnterior - i,
        esMesActual: false,
        fechaStr: `${year}-${String(month).padStart(2, '0')}-${String(diasMesAnterior - i).padStart(2, '0')}`,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({
        numero: d,
        esMesActual: true,
        fechaStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Días del siguiente mes para completar la cuadrícula (35 o 42 celdas)
    const totalCeldas = celdas.length > 35 ? 42 : 35;
    const diasSiguientes = totalCeldas - celdas.length;
    for (let d = 1; d <= diasSiguientes; d++) {
      celdas.push({
        numero: d,
        esMesActual: false,
        fechaStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    return celdas;
  };

  // Cálculo de semana (Lunes a Domingo)
  const getInicioSemana = (d: Date) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return date;
  };

  const inicioSemana = getInicioSemana(fechaActual);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);

  // Formato del título de fecha
  const getTituloEncabezado = () => {
    const mesNombre = MESES[fechaActual.getMonth()];
    const anio = fechaActual.getFullYear();

    if (vista === 'mes' || vista === 'agenda-mes') {
      return `${mesNombre} ${anio}`;
    }
    if (vista === 'semana' || vista === 'agenda-semana') {
      const mesInicio = MESES[inicioSemana.getMonth()].slice(0, 3);
      const mesFin = MESES[finSemana.getMonth()].slice(0, 3);
      return `${inicioSemana.getDate()} de ${mesInicio}. – ${finSemana.getDate()} de ${mesFin}. de ${anio}`;
    }
    if (vista === 'dia') {
      return `${fechaActual.getDate()} de ${mesNombre} de ${anio}`;
    }
    return '';
  };

  const esHoy = (diaNumero: number, esMesActual: boolean) => {
    return (
      esMesActual &&
      diaNumero === 16 &&
      fechaActual.getMonth() === 8 &&
      fechaActual.getFullYear() === 2026
    );
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ENCABEZADO PRINCIPAL */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
            Calendario (Tareas)
          </h1>
        </div>

        {/* TARJETA BLANCA PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">

          {/* LEYENDA DE CATEGORÍAS */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600 font-medium pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b3b5c]"></span>
              <span>Tus Tareas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a3cb38]"></span>
              <span>Operación</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006266]"></span>
              <span>Ventas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4bcffa]"></span>
              <span>Administración</span>
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN Y VISTAS */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* CONTROLES IZQUIERDOS */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navegar('prev')}
                className="px-3 py-1 border border-[#1ac2c2] text-[#1ac2c2] rounded-lg text-xs font-bold hover:bg-[#1ac2c2]/10 transition-colors"
              >
                &lt;
              </button>
              <button
                onClick={() => navegar('next')}
                className="px-3 py-1 border border-[#1ac2c2] text-[#1ac2c2] rounded-lg text-xs font-bold hover:bg-[#1ac2c2]/10 transition-colors"
              >
                &gt;
              </button>
              <button
                onClick={irAHoy}
                className="px-4 py-1 bg-[#1ac2c2]/20 border border-[#1ac2c2] text-[#128a8a] rounded-lg text-xs font-semibold hover:bg-[#1ac2c2]/30 transition-colors"
              >
                Hoy
              </button>
            </div>

            {/* TÍTULO DE FECHA CENTRAL */}
            <h2 className="text-base font-semibold text-gray-600 capitalize">
              {getTituloEncabezado()}
            </h2>

            {/* BOTONES VISTA DERECHA */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  vista === 'mes'
                    ? 'bg-[#1ac2c2] text-white'
                    : 'border border-[#1ac2c2] text-[#1ac2c2] hover:bg-[#1ac2c2]/10'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setVista('semana')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  vista === 'semana'
                    ? 'bg-[#1ac2c2] text-white'
                    : 'border border-[#1ac2c2] text-[#1ac2c2] hover:bg-[#1ac2c2]/10'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setVista('dia')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  vista === 'dia'
                    ? 'bg-[#1ac2c2] text-white'
                    : 'border border-[#1ac2c2] text-[#1ac2c2] hover:bg-[#1ac2c2]/10'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setVista('agenda-semana')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  vista === 'agenda-semana'
                    ? 'bg-[#1ac2c2] text-white'
                    : 'border border-[#1ac2c2] text-[#1ac2c2] hover:bg-[#1ac2c2]/10'
                }`}
              >
                Agenda
              </button>
              <button
                onClick={() => setVista('agenda-mes')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  vista === 'agenda-mes'
                    ? 'bg-[#1ac2c2] text-white'
                    : 'border border-[#1ac2c2] text-[#1ac2c2] hover:bg-[#1ac2c2]/10'
                }`}
              >
                Agenda
              </button>
            </div>
          </div>

          {/* VISTA 1: MES */}
          {vista === 'mes' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-white text-center text-xs font-semibold text-gray-400 border-b border-gray-200 py-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia}>{dia}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-white">
                {getDiasMesGrid().map((celda, idx) => {
                  const destacado = esHoy(celda.numero, celda.esMesActual);
                  return (
                    <div
                      key={idx}
                      className={`h-24 p-2 relative flex flex-col justify-start items-end ${
                        !celda.esMesActual ? 'bg-slate-50/50 text-gray-300' : 'text-gray-600'
                      } ${destacado ? 'bg-blue-50/30' : ''}`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          destacado
                            ? 'bg-[#1ac2c2] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm'
                            : ''
                        }`}
                      >
                        {celda.numero}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA 2: SEMANA */}
          {vista === 'semana' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-8 bg-white border-b border-gray-200 text-center text-xs font-semibold text-gray-500 divide-x divide-gray-200">
                <div className="py-2 text-[10px] text-gray-400">Todo el día</div>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(inicioSemana);
                  d.setDate(d.getDate() + i);
                  return (
                    <div key={i} className="py-2">
                      {DIAS_SEMANA[i]} {d.getDate()}/{d.getMonth() + 1}
                    </div>
                  );
                })}
              </div>
              <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">
                {HORAS_DIA.map((hora) => (
                  <div key={hora} className="grid grid-cols-8 divide-x divide-gray-100 min-h-[38px]">
                    <div className="text-[11px] text-gray-400 font-medium text-right pr-3 pt-1 bg-slate-50/30">
                      {hora}
                    </div>
                    {Array.from({ length: 7 }).map((_, col) => (
                      <div key={col} className="hover:bg-blue-50/20 transition-colors"></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: DÍA */}
          {vista === 'dia' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 text-center py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                {DIAS_SEMANA_COMPLETO[(fechaActual.getDay() + 6) % 7]}
              </div>
              <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">
                <div className="grid grid-cols-12 divide-x divide-gray-100 min-h-[36px] bg-slate-50/30">
                  <div className="col-span-2 text-[11px] text-gray-400 font-medium text-right pr-3 pt-1">
                    Todo el día
                  </div>
                  <div className="col-span-10"></div>
                </div>
                {HORAS_DIA.map((hora) => (
                  <div key={hora} className="grid grid-cols-12 divide-x divide-gray-100 min-h-[38px]">
                    <div className="col-span-2 text-[11px] text-gray-400 font-medium text-right pr-3 pt-1">
                      {hora}
                    </div>
                    <div className="col-span-10 hover:bg-blue-50/20 transition-colors"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTAS 4 & 5: AGENDA */}
          {(vista === 'agenda-semana' || vista === 'agenda-mes') && (
            <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[300px]">
              <div className="bg-gray-100 py-1.5 text-center text-xs text-gray-500 font-medium">
                No hay eventos para mostrar
              </div>
              <div className="flex justify-center items-center h-64 text-xs text-gray-400 italic">
                Agenda vacía para este período
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}