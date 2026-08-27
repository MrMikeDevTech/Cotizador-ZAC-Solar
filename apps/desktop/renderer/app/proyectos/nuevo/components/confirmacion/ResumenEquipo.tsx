'use client';

import React from 'react';
import Card from './Card';
import { panelesData, inversoresData } from '../../constants';

interface ResumenEquipoProps {
  panelKey?: string;
  cantPaneles?: number | '';
  inversorKey?: string;
  cantInversores?: number | '';
  tamanoSistema?: number;
  produccion?: number;
  autoconsumo?: number;
  periodo?: string;
}

export default function ResumenEquipo({
  panelKey = '',
  cantPaneles = 0,
  inversorKey = '',
  cantInversores = 0,
  tamanoSistema = 0,
  produccion = 0,
  autoconsumo = 0,
  periodo = 'Bimestral',
}: ResumenEquipoProps) {
  const panel = panelKey ? panelesData[panelKey] : undefined;
  const inversor = inversorKey ? inversoresData[inversorKey] : undefined;

  const numPaneles = Number(cantPaneles) || 0;
  const numInversores = Number(cantInversores) || 0;

  // Extraer marca y modelo del panel
  const nombrePanel = panel?.nombre || 'No seleccionado';
  const partesPanel = nombrePanel.split(',');
  const marcaPanel = partesPanel[0]?.trim() || 'Solar';
  const modeloPanel = partesPanel[1]?.trim() || nombrePanel;

  // Extraer marca y modelo del inversor
  const nombreInversor = inversor?.nombre || 'No seleccionado';
  const partesInversor = nombreInversor.split(',');
  const marcaInversor = partesInversor[0]?.trim() || 'Growatt';
  const modeloInversor = partesInversor[1]?.trim() || nombreInversor;

  // Área estimada: ~2.795 m² por panel de alta potencia (ej. 600W+)
  const areaAprox = numPaneles > 0 ? (numPaneles * 2.795).toFixed(2) : '0';
  const unidadPeriodo = periodo === 'Bimestral' ? 'bimestre' : 'mes';

  return (
    <Card title="Información de equipo">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm text-gray-700">
        {/* COLUMNA 1: PANELES Y SISTEMA */}
        <div className="space-y-2.5">
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Modelo del panel:</strong>
            <span className="font-semibold text-gray-800 text-right truncate max-w-[220px]" title={modeloPanel}>
              {modeloPanel}
            </span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Marca:</strong>
            <span className="font-semibold text-gray-800">{marcaPanel}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Cantidad:</strong>
            <span className="font-bold text-[#00388d]">{numPaneles}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Potencia:</strong>
            <span className="font-semibold text-gray-800">{panel ? `${panel.watts} W` : '0 W'}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Producción del sistema:</strong>
            <span className="font-bold text-gray-800">
              {produccion.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kWh/{unidadPeriodo}
            </span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Área aprox.:</strong>
            <span className="font-semibold text-gray-800">{areaAprox} m²</span>
          </p>
          <p className="flex justify-between">
            <strong className="text-gray-500 font-medium">Tamaño del sistema:</strong>
            <span className="font-bold text-[#00388d]">
              {tamanoSistema > 0 ? `${tamanoSistema.toLocaleString('en-US')} W` : '0 W'}
            </span>
          </p>
        </div>

        {/* COLUMNA 2: INVERSOR Y RENDIMIENTO */}
        <div className="space-y-2.5">
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Modelo de inversor:</strong>
            <span className="font-semibold text-gray-800 text-right truncate max-w-[220px]" title={modeloInversor}>
              {modeloInversor}
            </span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Marca:</strong>
            <span className="font-semibold text-gray-800">{marcaInversor}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Cantidad:</strong>
            <span className="font-bold text-[#00388d]">{numInversores}</span>
          </p>
          <p className="flex justify-between">
            <strong className="text-gray-500 font-medium">Porcentaje de autoconsumo:</strong>
            <span className="font-bold text-[#2dd4bf] text-sm">
              {autoconsumo.toFixed(2)}%
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}
