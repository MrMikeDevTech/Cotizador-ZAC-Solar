'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSesion } from '../lib/SesionContext';
import { TarjetaResumen } from './dashboard/TarjetaResumen';
import { TarjetaProyectosPorFase } from './dashboard/TarjetaProyectosPorFase';
import { TarjetaActividad } from './dashboard/TarjetaActividad';
import { TarjetaTareas } from './dashboard/TarjetaTareas';
import { TarjetaContactos } from './dashboard/TarjetaContactos';
import { TarjetaEventos } from './dashboard/TarjetaEventos';
import { TarjetaCfeStatus } from './dashboard/TarjetaCfeStatus';
import type {
  ActividadReporte,
  ContactoReciente,
  EstadoCfeRates,
  EstadoRecurso,
  FaseResumen,
  ItemActividad,
  ItemAgenda,
  ResumenReporte,
  TareaPendiente,
} from './dashboard/tipos';

/** Ventana de la agenda para el widget de "próximos eventos". */
const DIAS_AGENDA = 30;
/** Página de actividad que se trae para alimentar la gráfica de los últimos días. */
const PAGINA_ACTIVIDAD = { pagina: 1, porPagina: 100 };

function mensajeError(razon: unknown): string {
  if (razon instanceof ApiError) return razon.message;
  return 'No se pudo cargar la información.';
}

export default function Home() {
  const { usuario } = useSesion();

  const [resumen, setResumen] = useState<EstadoRecurso<ResumenReporte>>({ estado: 'cargando' });
  const [actividad, setActividad] = useState<EstadoRecurso<ItemActividad[]>>({ estado: 'cargando' });
  const [tareas, setTareas] = useState<EstadoRecurso<TareaPendiente[]>>({ estado: 'cargando' });
  const [contactos, setContactos] = useState<EstadoRecurso<ContactoReciente[]>>({ estado: 'cargando' });
  const [eventos, setEventos] = useState<EstadoRecurso<ItemAgenda[]>>({ estado: 'cargando' });
  const [cfeStatus, setCfeStatus] = useState<EstadoRecurso<EstadoCfeRates>>({ estado: 'cargando' });

  useEffect(() => {
    const ahora = new Date();
    const hasta = new Date(ahora);
    hasta.setDate(hasta.getDate() + DIAS_AGENDA);

    // Las seis peticiones salen en paralelo: una tarjeta que falle no debe
    // tumbar el resto del tablero, por eso se resuelven con allSettled y
    // cada tarjeta recibe únicamente su propio resultado.
    Promise.allSettled([
      api.get<ResumenReporte>('/api/reportes/resumen'),
      api.get<ActividadReporte>(
        `/api/reportes/actividad?pagina=${PAGINA_ACTIVIDAD.pagina}&porPagina=${PAGINA_ACTIVIDAD.porPagina}`
      ),
      api.get<TareaPendiente[]>('/api/tareas?completada=false'),
      api.get<ContactoReciente[]>('/api/contactos'),
      api.get<ItemAgenda[]>(`/api/agenda?desde=${ahora.toISOString()}&hasta=${hasta.toISOString()}`),
      api.get<EstadoCfeRates>('/api/cfe-rates/status'),
    ]).then(([rResumen, rActividad, rTareas, rContactos, rEventos, rCfe]) => {
      setResumen(
        rResumen.status === 'fulfilled'
          ? { estado: 'listo', datos: rResumen.value }
          : { estado: 'error', mensaje: mensajeError(rResumen.reason) }
      );
      setActividad(
        rActividad.status === 'fulfilled'
          ? { estado: 'listo', datos: rActividad.value.datos }
          : { estado: 'error', mensaje: mensajeError(rActividad.reason) }
      );
      setTareas(
        rTareas.status === 'fulfilled'
          ? { estado: 'listo', datos: rTareas.value }
          : { estado: 'error', mensaje: mensajeError(rTareas.reason) }
      );
      setContactos(
        rContactos.status === 'fulfilled'
          ? { estado: 'listo', datos: rContactos.value }
          : { estado: 'error', mensaje: mensajeError(rContactos.reason) }
      );
      setEventos(
        rEventos.status === 'fulfilled'
          ? { estado: 'listo', datos: rEventos.value }
          : { estado: 'error', mensaje: mensajeError(rEventos.reason) }
      );
      setCfeStatus(
        rCfe.status === 'fulfilled'
          ? { estado: 'listo', datos: rCfe.value }
          : { estado: 'error', mensaje: mensajeError(rCfe.reason) }
      );
    });
  }, []);

  // La gráfica de proyectos por fase solo necesita ese recorte del resumen;
  // se deriva aquí para no pedirle datos duplicados al backend.
  const proyectosPorFase: EstadoRecurso<FaseResumen[]> =
    resumen.estado === 'listo'
      ? { estado: 'listo', datos: resumen.datos.proyectosPorFase }
      : resumen.estado === 'error'
        ? { estado: 'error', mensaje: resumen.mensaje }
        : { estado: 'cargando' };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:auto-rows-[13rem]">
        <TarjetaResumen
          estado={resumen}
          nombreUsuario={usuario?.nombre ?? 'equipo'}
          className="md:col-span-2 lg:col-span-4"
        />

        <TarjetaProyectosPorFase estado={proyectosPorFase} className="md:col-span-2 lg:col-span-2 lg:row-span-2" />
        <TarjetaActividad estado={actividad} className="md:col-span-2 lg:col-span-2 lg:row-span-2" />

        <TarjetaTareas estado={tareas} className="md:col-span-2 lg:col-span-2 lg:row-span-2" />
        <TarjetaContactos estado={contactos} className="md:col-span-1 lg:col-span-1" />
        <TarjetaEventos estado={eventos} className="md:col-span-1 lg:col-span-1" />
        <TarjetaCfeStatus estado={cfeStatus} className="md:col-span-2 lg:col-span-2" />
      </div>
    </div>
  );
}
