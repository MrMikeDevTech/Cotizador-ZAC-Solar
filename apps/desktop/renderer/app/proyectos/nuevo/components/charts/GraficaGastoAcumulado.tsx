'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './ChartSetup';

registerChartJS();

interface GraficaGastoAcumuladoProps {
  labels?: string[];
  conPaneles?: number[];
  sinPaneles?: number[];
}

export default function GraficaGastoAcumulado({
  labels = ['0', '1', '2', '3', '4', '5'],
  conPaneles = [0, 69220, 70000, 70500, 71000, 71362],
  sinPaneles = [0, 16000, 32000, 48000, 64000, 81969],
}: GraficaGastoAcumuladoProps) {

  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Con Paneles',
        data: conPaneles,
        borderColor: '#1f2937',
        backgroundColor: '#fff',
        pointBorderColor: '#1f2937',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0,
      },
      {
        label: 'Sin Paneles',
        data: sinPaneles,
        borderColor: '#38bdf8',
        backgroundColor: '#fff',
        pointBorderColor: '#38bdf8',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0,
      },
    ],
  }), [labels, conPaneles, sinPaneles]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 40 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Años',
          color: '#38bdf8',
          font: { weight: 'bold' as const, size: 12 },
        },
        grid: { color: '#e5e7eb' },
        ticks: { font: { size: 10 }, color: '#6b7280' },
      },
      y: {
        title: {
          display: true,
          text: 'Gasto',
          color: '#00388d',
          font: { weight: 'bold' as const },
        },
        grid: { color: '#e5e7eb' },
        border: { display: false },
        min: 0,
        ticks: {
          font: { size: 10 },
          color: '#6b7280',
          callback: (value: any) => '$' + value,
        },
      },
    },
  }), []);

  return (
    <div className="relative w-full h-80 pt-2">
      {/* LEYENDA FLOTANTE */}
      <div className="absolute top-0 right-2 flex gap-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#1f2937]"></div>
          <span className="text-xs text-gray-600">Con Paneles</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#38bdf8]"></div>
          <span className="text-xs text-gray-600">Sin Paneles</span>
        </div>
      </div>

      <Line data={chartData} options={chartOptions} />
    </div>
  );
}