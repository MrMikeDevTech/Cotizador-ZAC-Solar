'use client';

import React from 'react';
import Card from './Card';
import { formatearMoneda } from './calculosConfirmacion';

interface ResumenAhorroProps {
  pagoPromedioCFE?: number;
  nuevoPago?: number;
  ahorro?: number;
  periodo?: string;
}

export default function ResumenAhorro({
  pagoPromedioCFE = 0,
  nuevoPago = 0,
  ahorro = 0,
  periodo = 'Bimestral',
}: ResumenAhorroProps) {
  const unidad = periodo === 'Bimestral' ? 'bimestral' : 'mensual';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
      {/* 1. SIN PANELES */}
      <Card title="Sin paneles">
        <div className="py-2">
          <p className="text-gray-400 text-xs md:text-sm mb-2">Pago {unidad} promedio a CFE</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800">
            {formatearMoneda(pagoPromedioCFE)}
          </p>
        </div>
      </Card>

      {/* 2. CON PANELES */}
      <Card title="Con paneles">
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <p className="text-gray-400 text-xs md:text-sm mb-2">Pago {unidad} promedio a CFE</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">
              {formatearMoneda(nuevoPago)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs md:text-sm mb-2">Ahorro {unidad}</p>
            <p className="text-xl md:text-2xl font-bold text-[#2dd4bf]">
              {formatearMoneda(ahorro)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
