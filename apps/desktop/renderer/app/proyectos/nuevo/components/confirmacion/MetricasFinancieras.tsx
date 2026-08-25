'use client';

import React, { useMemo } from 'react';
import Card from './Card';
import {
  calcularProyeccion5Anos,
  calcularROI,
  calcularTIR5Anos,
  formatearMoneda,
} from './calculosConfirmacion';

interface MetricasFinancierasProps {
  pagoPromedioCFE?: number;
  nuevoPago?: number;
  granTotalInversion?: number;
  ahorroAnual?: number;
  periodo?: string;
}

export default function MetricasFinancieras({
  pagoPromedioCFE = 0,
  nuevoPago = 0,
  granTotalInversion = 0,
  ahorroAnual = 0,
  periodo = 'Bimestral',
}: MetricasFinancierasProps) {
  const { gastoSinPaneles5Anos, gastoConPaneles5Anos, ahorro5Anos } = useMemo(() => {
    return calcularProyeccion5Anos(pagoPromedioCFE, nuevoPago, granTotalInversion, periodo);
  }, [pagoPromedioCFE, nuevoPago, granTotalInversion, periodo]);

  const roiTexto = useMemo(() => {
    return calcularROI(granTotalInversion, ahorroAnual);
  }, [granTotalInversion, ahorroAnual]);

  const tirPorcentaje = useMemo(() => {
    return calcularTIR5Anos(granTotalInversion, ahorroAnual);
  }, [granTotalInversion, ahorroAnual]);

  return (
    <div className="space-y-6">
      {/* 1. GASTO TOTAL A 5 AÑOS */}
      <Card title="Gasto total a 5 años">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center py-2">
          <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100/80">
            <p className="text-xs text-gray-500 mb-1">Sin paneles</p>
            <p className="font-bold text-base md:text-lg text-gray-800">
              {formatearMoneda(gastoSinPaneles5Anos)}
            </p>
          </div>
          <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100/80">
            <p className="text-xs text-gray-500 mb-1">Con paneles</p>
            <p className="font-bold text-base md:text-lg text-gray-800">
              {formatearMoneda(gastoConPaneles5Anos)}
            </p>
          </div>
          <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100/80">
            <p className="text-xs text-gray-500 mb-1">Ahorro proyectado</p>
            <p className="font-bold text-base md:text-lg text-[#2dd4bf]">
              {formatearMoneda(ahorro5Anos)}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. TIR Y ROI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="TIR a 5 años">
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">Tasa interna de retorno estimada</p>
            <p className="text-2xl font-bold text-[#00388d]">
              {tirPorcentaje > 0 ? `${tirPorcentaje}%` : 'N/A'}
            </p>
          </div>
        </Card>

        <Card title="ROI (Flujos acumulados)">
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">Recuperación de inversión</p>
            <p className="text-2xl font-bold text-[#2dd4bf]">
              {roiTexto}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
