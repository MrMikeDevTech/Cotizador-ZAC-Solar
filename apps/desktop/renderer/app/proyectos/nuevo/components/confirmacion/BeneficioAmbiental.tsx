'use client';

import React, { useMemo } from 'react';
import { Car, Cloud, TreeDeciduous } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import Card from './Card';
import { calcularBeneficiosAmbientales } from './calculosConfirmacion';

interface BeneficioAmbientalProps {
  produccion?: number;
  periodo?: string;
}

export default function BeneficioAmbiental({
  produccion = 0,
  periodo = 'Bimestral',
}: BeneficioAmbientalProps) {
  const { kgCO2, arboles, kmAuto } = useMemo(() => {
    return calcularBeneficiosAmbientales(produccion, periodo);
  }, [produccion, periodo]);

  return (
    <Card title="Beneficio ambiental anual">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 text-center">
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100/80">
          <Icono icon={Cloud} size={28} className="mx-auto mb-2 text-[#2dd4bf]" />
          <p className="text-base font-bold text-gray-800">
            {kgCO2 > 0 ? kgCO2.toLocaleString('es-MX') : '0.00'} kgCO₂
          </p>
          <p className="text-xs text-gray-500 mt-0.5">sin emitir a la atmósfera</p>
        </div>

        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100/80">
          <Icono icon={TreeDeciduous} size={28} className="mx-auto mb-2 text-[#2dd4bf]" />
          <p className="text-base font-bold text-gray-800">
            {arboles > 0 ? arboles.toLocaleString('es-MX') : '0'} árboles
          </p>
          <p className="text-xs text-gray-500 mt-0.5">plantados equivalentes</p>
        </div>

        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100/80">
          <Icono icon={Car} size={28} className="mx-auto mb-2 text-[#2dd4bf]" />
          <p className="text-base font-bold text-gray-800">
            {kmAuto > 0 ? kmAuto.toLocaleString('es-MX') : '0.00'} km
          </p>
          <p className="text-xs text-gray-500 mt-0.5">sin manejar en auto</p>
        </div>
      </div>
    </Card>
  );
}
