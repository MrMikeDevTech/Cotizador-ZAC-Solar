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
  /** Límite de kWh de la tarifa contratada (limitesDACTarifas). Si no se conoce, la línea de límite DAC no se dibuja. */
  limiteDacKwh?: number | null;
  /** Costo promedio por kWh (pagoPromedioCFE / consumoPromedioKwh) para convertir el límite DAC a un monto. */
  costoPromedioKwh?: number;
}

export default function GraficaProyeccion({
  consumos,
  autoconsumo,
  ahorro,
  pagoMinimo = PAGO_MINIMO_CFE,
  limiteDacKwh = null,
  costoPromedioKwh = 0,
}: GraficaProyeccionProps) {
  const consumosVolteados = useMemo(() => [...consumos].reverse(), [consumos]);

  const chartData = useMemo(() => {
    const pagosHistoricos = consumosVolteados.map(item => Number(item.pago) || 0);
    const pagosNuevos = consumosVolteados.map(item => {
      const pagoOriginal = Number(item.pago) || 0;
      return autoconsumo >= 100 ? pagoMinimo : Math.max(pagoOriginal - ahorro, pagoMinimo);
    });

    // Línea de referencia: monto al que se llegaría al alcanzar el límite de kWh de la tarifa DAC.
    const pagoLimiteDac = limiteDacKwh != null ? limiteDacKwh * costoPromedioKwh : null;
    const datasets = [
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
        borderColor: '#38bdf8',
        backgroundColor: '#fff',
        pointBorderColor: '#38bdf8',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0,
      },
    ];

    if (pagoLimiteDac != null) {
      datasets.push({
        label: 'Pago límite DAC',
        data: consumosVolteados.map(() => pagoLimiteDac),
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
  }, [consumosVolteados, autoconsumo, ahorro, pagoMinimo, limiteDacKwh, costoPromedioKwh]);

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