'use client';

import React from 'react';
import Card from './Card';
import { ConceptoCotizacion, EstructuraInstalacion, CargoEditable, TipoMoneda } from '../../types';
import { formatearMoneda } from './calculosConfirmacion';

interface ResumenCotizacionProps {
  conceptos?: ConceptoCotizacion[];
  estructuraActual?: EstructuraInstalacion;
  cargosEditables?: CargoEditable[];
  subtotalConDescuento?: number;
  granTotal?: number;
  incluirIva?: boolean;
  tipoMoneda?: TipoMoneda;
}

export default function ResumenCotizacion({
  conceptos = [],
  estructuraActual,
  cargosEditables = [],
  subtotalConDescuento = 0,
  granTotal = 0,
  incluirIva = false,
  tipoMoneda = 'MXN',
}: ResumenCotizacionProps) {
  const formatMonto = (val: number) => formatearMoneda(val, tipoMoneda);

  return (
    <Card title="Revisa tu cotización">
      <div className="max-w-xl mx-auto space-y-3 text-xs md:text-sm">
        {/* CONCEPTOS BASE */}
        {conceptos.map((item) => {
          const montoTotal = item.costoBase * (1 + item.margenPorcentaje / 100);
          return (
            <div
              key={item.id}
              className="flex justify-between items-center border-b border-dashed border-gray-200 pb-2 text-gray-700"
            >
              <span>{item.concepto}</span>
              <span className="font-semibold text-gray-900">{formatMonto(montoTotal)}</span>
            </div>
          );
        })}

        {/* ESTRUCTURA SELECCIONADA */}
        {estructuraActual && (
          <div>
            <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-1 text-gray-700">
              <span>Precio por tipo de estructura</span>
              <span className="font-semibold text-gray-900">{formatMonto(estructuraActual.precio)}</span>
            </div>
            <p className="text-[11px] text-gray-500 italic pt-1 pl-2">
              *{estructuraActual.nombre}
            </p>
          </div>
        )}

        {/* CARGOS EDITABLES ADICIONALES */}
        {cargosEditables.map(
          (cargo) =>
            cargo.monto > 0 && (
              <div
                key={cargo.id}
                className="flex justify-between items-center border-b border-dashed border-gray-200 pb-2 text-gray-700"
              >
                <span>{cargo.nombre || 'Otro cargo'}</span>
                <span className="font-semibold text-gray-900">{formatMonto(cargo.monto)}</span>
              </div>
            )
        )}

        {/* SUBTOTAL */}
        <div className="flex justify-between font-bold pt-3 border-t-2 border-gray-200 text-gray-800">
          <span>Subtotal</span>
          <span>{formatMonto(subtotalConDescuento)}</span>
        </div>

        {/* GRAN TOTAL */}
        <div className="flex justify-between font-bold text-base md:text-lg text-[#00388d] pt-1">
          <span>Gran total en pesos</span>
          <span>{formatMonto(granTotal)}</span>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          {incluirIva ? 'El IVA (16%) está incluido.' : 'El IVA no está incluido.'}
        </p>
      </div>
    </Card>
  );
}
