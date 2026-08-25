'use client';

import React, { useMemo } from 'react';
import Card from './Card';
import { ConsumoPeriodo } from '../../types';
import { formatearMoneda } from './calculosConfirmacion';

interface TablaConsumoHistoricoProps {
  consumos: ConsumoPeriodo[];
}

export default function TablaConsumoHistorico({ consumos }: TablaConsumoHistoricoProps) {
  const { totalKwh, totalPago } = useMemo(() => {
    return consumos.reduce(
      (acc, curr) => ({
        totalKwh: acc.totalKwh + (Number(curr.kwh) || 0),
        totalPago: acc.totalPago + (Number(curr.pago) || 0),
      }),
      { totalKwh: 0, totalPago: 0 }
    );
  }, [consumos]);

  return (
    <Card title="Consumo histórico">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 font-semibold">
              <th className="py-2.5">Inicio</th>
              <th className="py-2.5">Término</th>
              <th className="py-2.5 text-center md:text-left">kWh</th>
              <th className="py-2.5 text-right">Pago a CFE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {consumos.map((item, index) => {
              const kwhNum = Number(item.kwh) || 0;
              const pagoNum = Number(item.pago) || 0;

              return (
                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 capitalize">{item.inicioStr || '---'}</td>
                  <td className="py-2.5 capitalize">{item.terminoStr || '---'}</td>
                  <td className="py-2.5 text-center md:text-left font-medium">
                    {kwhNum > 0 ? kwhNum.toLocaleString('es-MX') : '-'}
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    {pagoNum > 0 ? formatearMoneda(pagoNum) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-bold text-gray-800">
              <td colSpan={2} className="py-3">Total</td>
              <td className="py-3 text-center md:text-left">
                {totalKwh > 0 ? totalKwh.toLocaleString('es-MX') : '0'} kWh
              </td>
              <td className="py-3 text-right text-[#00388d]">
                {formatearMoneda(totalPago)}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="text-right text-[11px] text-gray-400 mt-2">
          * Los montos equivalen al cobro por kWh consumidos.
        </p>
      </div>
    </Card>
  );
}
