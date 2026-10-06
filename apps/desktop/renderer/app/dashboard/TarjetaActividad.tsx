'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Activity } from 'lucide-react';
import { registerChartJS } from '../proyectos/nuevo/components/charts/ChartSetup';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { agruparActividadPorDia } from './utilidades';
import type { EstadoRecurso, ItemActividad } from './tipos';

registerChartJS();

const DIAS_VENTANA = 14;

interface TarjetaActividadProps {
  estado: EstadoRecurso<ItemActividad[]>;
  className?: string;
}

/**
 * Línea de altas (proyectos/contactos) por día, agregando
 * `/api/reportes/actividad` en el cliente. Si en la ventana de los últimos
 * 14 días no hubo ninguna alta, se evita dibujar dos líneas planas en cero.
 */
export function TarjetaActividad({ estado, className = '' }: TarjetaActividadProps) {
  return (
    <TarjetaBento titulo="Actividad reciente" icono={Activity} className={className}>
      <EnvolturaEstado
        estado={estado}
        vacio={(items) => {
          const { proyectos, contactos } = agruparActividadPorDia(items, DIAS_VENTANA);
          return proyectos.every((v) => v === 0) && contactos.every((v) => v === 0);
        }}
        mensajeVacio="Sin altas de proyectos o contactos en los últimos 14 días."
        alturaEsqueleto="h-56"
        render={(items) => <GraficaActividad items={items} />}
      />
    </TarjetaBento>
  );
}

function GraficaActividad({ items }: { items: ItemActividad[] }) {
  const { etiquetas, proyectos, contactos } = useMemo(
    () => agruparActividadPorDia(items, DIAS_VENTANA),
    [items]
  );

  const data = useMemo(
    () => ({
      labels: etiquetas,
      datasets: [
        {
          label: 'Proyectos nuevos',
          data: proyectos,
          borderColor: '#00388d',
          backgroundColor: '#fff',
          pointBackgroundColor: '#fff',
          pointBorderColor: '#00388d',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
        {
          label: 'Contactos nuevos',
          data: contactos,
          borderColor: '#2dd4bf',
          backgroundColor: '#fff',
          pointBackgroundColor: '#fff',
          pointBorderColor: '#2dd4bf',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
      ],
    }),
    [etiquetas, proyectos, contactos]
  );

  const opciones = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: { boxWidth: 10, font: { size: 11 }, color: '#4b5563' },
        },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          titleColor: '#1f2937',
          bodyColor: '#1f2937',
          borderColor: '#e5e7eb',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 9 }, color: '#6b7280', maxRotation: 0, autoSkip: true },
        },
        y: {
          min: 0,
          ticks: { precision: 0 as const, font: { size: 10 }, color: '#6b7280' },
          grid: { color: '#f1f5f9' },
          border: { display: false },
        },
      },
    }),
    []
  );

  return (
    <div className="flex-1 min-h-[14rem]">
      <Line data={data} options={opciones} />
    </div>
  );
}
