'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './ChartSetup';
import { ConsumoPeriodo } from '../../types';
import { limitesDACTarifas } from '../../constants';

registerChartJS();

interface GraficaConsumoProps {
  consumos: ConsumoPeriodo[];
  tarifaSeleccionada: string;
}

export default function GraficaConsumo({ consumos, tarifaSeleccionada }: GraficaConsumoProps) {
  const consumosVolteados = useMemo(() => [...consumos].reverse(), [consumos]);
  const limiteActual = limitesDACTarifas[tarifaSeleccionada];

  const chartData = useMemo(() => {
    const datasets: any[] = [
      {
        label: 'Consumo',
        data: consumosVolteados.map(item => Number(item.kwh) || 0),
        borderColor: '#00388d',
        backgroundColor: '#fff',
        pointBorderColor: '#00388d',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0,
      },
    ];

    if (limiteActual !== null && limiteActual !== undefined) {
      datasets.push({
        label: 'Límite DAC',
        data: consumosVolteados.map(() => limiteActual),
        borderColor: '#ef4444',
        backgroundColor: '#fff',
        pointBorderColor: '#ef4444',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0,
      });
    }

    return {
      labels: consumosVolteados.map(item => item.inicioStr || '---'),
      datasets,
    };
  }, [consumosVolteados, limiteActual]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } },
      },
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
        ticks: { font: { size: 10 }, color: '#6b7280' },
      },
    },
  }), []);

  return (
    <div className="w-full h-80">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
