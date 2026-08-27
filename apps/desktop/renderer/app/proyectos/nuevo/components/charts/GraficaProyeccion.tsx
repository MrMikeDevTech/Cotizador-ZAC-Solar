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
    
    // AQUÍ ESTÁ LA MAGIA DE LA LÍNEA ROJA:
    // Sustituye '(item as any).pagoDac' por la variable real donde guardes este costo.
    const pagosDAC = consumosVolteados.map(item => Number((item as any).pagoDac) || 3800);

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
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0,
        },
        {
          label: 'Nuevos pagos',
          data: pagosNuevos,
          borderColor: '#38bdf8', // Ajustado a un azul más claro como tu diseño
          backgroundColor: '#fff',
          pointBorderColor: '#38bdf8',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0,
        },
        {
          label: 'Pago límite DAC',
          data: pagosDAC,
          borderColor: '#ef4444',
          backgroundColor: '#fff',
          pointBorderColor: '#ef4444',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0,
        },
      ],
    };
  }, [consumosVolteados, autoconsumo, ahorro, pagoMinimo]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 70, // Espacio para que quepa la leyenda flotante de 2 pisos
      },
    },
    plugins: {
      legend: {
        display: false, // Apagamos la leyenda nativa
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
        title: {
          display: true,
          text: 'Periodo',
          color: '#38bdf8', // Color azul del diseño para la palabra "Periodo"
          font: { weight: 'bold' as const, size: 14 },
        },
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
        grid: { color: '#9ca3af' }, // Líneas de fondo más oscuritas
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
    <div className="relative w-full h-80 pt-4">
      
      {/* LEYENDA CUSTOM FLOTANTE */}
      <div className="absolute top-0 right-2 grid grid-cols-2 gap-x-6 gap-y-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#1f2937]"></div>
          <span className="text-sm text-gray-600">Pago histórico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#38bdf8]"></div>
          <span className="text-sm text-gray-600">Nuevos pagos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#ef4444]"></div>
          <span className="text-sm text-gray-600">Pago límite DAC</span>
        </div>
      </div>

      <Line data={chartData} options={chartOptions} />
    </div>
  );
}