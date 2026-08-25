'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// ¡Aquí registramos los elementos que Chart.js necesita para dibujar las barras!
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface GraficaConsumoAnualProps {
  labels?: string[];
  consumoHistorico?: number[];
  produccionSolar?: number[];
}

export default function GraficaConsumoAnual({
  labels = ['Mayo 2025', 'Julio 2025', 'Septiembre 2025', 'Noviembre 2025', 'Enero 2026', 'Marzo 2026'],
  consumoHistorico = [861, 975, 896, 668, 582, 786],
  produccionSolar = [998, 969, 882, 1003, 888, 1100],
}: GraficaConsumoAnualProps) {

  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Consumo histórico',
        data: consumoHistorico,
        backgroundColor: '#38bdf8', // Azul claro de tu diseño
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.6,
      },
      {
        label: 'Producción solar',
        data: produccionSolar,
        backgroundColor: '#34d399', // Verde de tu diseño
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.6,
      },
    ],
  }), [labels, consumoHistorico, produccionSolar]);

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
          text: 'Periodo',
          color: '#38bdf8',
          font: { weight: 'bold' as const, size: 12 },
        },
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#6b7280' },
      },
      y: {
        title: {
          display: true,
          text: 'kWh',
          color: '#00388d',
          font: { weight: 'bold' as const },
        },
        grid: { color: '#e5e7eb' },
        border: { display: false },
        min: 0,
        ticks: { font: { size: 10 }, color: '#6b7280' },
      },
    },
  }), []);

  return (
    <div className="relative w-full h-80 pt-2">
      {/* LEYENDA FLOTANTE */}
      <div className="absolute top-0 right-2 flex gap-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#38bdf8] rounded-sm"></div>
          <span className="text-xs text-gray-600">Consumo histórico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#34d399] rounded-sm"></div>
          <span className="text-xs text-gray-600">Producción solar</span>
        </div>
      </div>

      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}