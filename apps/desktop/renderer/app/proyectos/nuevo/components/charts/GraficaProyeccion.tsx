'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './ChartSetup';
import { ConsumoPeriodo } from '../../types';
import { PAGO_MINIMO_CFE } from '../../constants';

registerChartJS();

interface GraficaProyeccionProps {
  consumos: ConsumoPeriodo[];
  autoconsumo: number;
  ahorro: number;
  pagoMinimo?: number;
}

export default function GraficaProyeccion({
  consumos,
  autoconsumo,
  ahorro,
  pagoMinimo = PAGO_MINIMO_CFE,
}: GraficaProyeccionProps) {
  const consumosVolteados = useMemo(() => [...consumos].reverse(), [consumos]);

  const chartData = useMemo(() => {
    const pagosHistoricos = consumosVolteados.map(item => Number(item.pago) || 0);
    const pagosNuevos = consumosVolteados.map(item => {
      const pagoOriginal = Number(item.pago) || 0;
      return autoconsumo >= 100 ? pagoMinimo : Math.max(pagoOriginal - ahorro, pagoMinimo);
    });

    return {
      labels: consumosVolteados.map(item => item.inicioStr || '---'),
      datasets: [
        {
          label: 'Pago histórico',
          data: pagosHistoricos,
          borderColor: '#1f2937',
          backgroundColor: '#fff',
          pointBorderColor: '#1f2937',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          tension: 0,
        },
        {
          label: 'Nuevos pagos',
          data: pagosNuevos,
          borderColor: '#3b82f6',
          backgroundColor: '#fff',
          pointBorderColor: '#3b82f6',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          tension: 0,
        },
      ],
    };
  }, [consumosVolteados, autoconsumo, ahorro, pagoMinimo]);

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
          text: 'Monto',
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
    <div className="w-full h-80">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
