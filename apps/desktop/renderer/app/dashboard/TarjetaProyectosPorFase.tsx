'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';
import { registerChartJS } from '../proyectos/nuevo/components/charts/ChartSetup';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import type { EstadoRecurso, FaseResumen } from './tipos';

registerChartJS();

interface TarjetaProyectosPorFaseProps {
  estado: EstadoRecurso<FaseResumen[]>;
  className?: string;
}

/**
 * Barras de proyectos por fase, con el color que define cada fase en el
 * funnel (`/api/reportes/resumen`). Si todas las fases están en cero, se
 * muestra un estado vacío en vez de una gráfica plana que parezca real.
 */
export function TarjetaProyectosPorFase({ estado, className = '' }: TarjetaProyectosPorFaseProps) {
  return (
    <TarjetaBento
      titulo="Proyectos por fase"
      icono={BarChart3}
      enlace={{ href: '/funnel', etiqueta: 'Ver funnel' }}
      className={className}
    >
      <EnvolturaEstado
        estado={estado}
        vacio={(fases) => fases.length === 0 || fases.every((fase) => fase.total === 0)}
        mensajeVacio="Todavía no hay proyectos registrados en ninguna fase."
        alturaEsqueleto="h-56"
        render={(fases) => <GraficaFases fases={fases} />}
      />
    </TarjetaBento>
  );
}

function GraficaFases({ fases }: { fases: FaseResumen[] }) {
  const data = useMemo(
    () => ({
      labels: fases.map((fase) => fase.nombre),
      datasets: [
        {
          label: 'Proyectos',
          data: fases.map((fase) => fase.total),
          backgroundColor: fases.map((fase) => fase.color),
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    }),
    [fases]
  );

  const opciones = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
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
          ticks: { font: { size: 10 }, color: '#6b7280' },
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
      <Bar data={data} options={opciones} />
    </div>
  );
}
