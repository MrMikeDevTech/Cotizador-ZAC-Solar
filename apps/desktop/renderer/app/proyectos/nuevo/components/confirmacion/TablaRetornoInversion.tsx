'use client';

import React, { useMemo } from 'react';
import Card from './Card';
import { ConsumoPeriodo } from '../../types';
import { calcularDetalleRetornoInversion, formatearMoneda } from './calculosConfirmacion';

interface TablaRetornoInversionProps {
  consumos: ConsumoPeriodo[];
  produccion?: number;
  nuevoPago?: number;
}

export default function TablaRetornoInversion({
  consumos,
  produccion = 0,
  nuevoPago = 0,
}: TablaRetornoInversionProps) {
  const { filas, ahorroAnualTotal } = useMemo(() => {
    return calcularDetalleRetornoInversion(consumos, produccion, nuevoPago);
  }, [consumos, produccion, nuevoPago]);

  return (
    <Card title="Detalle del retorno de inversión">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px] md:text-xs">
          <thead>
            <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
              <th className="py-3 px-2 font-medium">Periodo</th>
              <th className="py-3 px-2 font-medium">Consumo histórico</th>
              <th className="py-3 px-2 font-medium">Energía generada por sistema</th>
              <th className="py-3 px-2 font-medium">Diferencia</th>
              <th className="py-3 px-2 font-medium">Nuevo consumo</th>
              <th className="py-3 px-2 font-medium">Banco solar</th>
              <th className="py-3 px-2 font-medium">Nuevo pago a CFE</th>
              <th className="py-3 px-2 font-medium">Pago histórico</th>
              <th className="py-3 px-2 font-medium">Ahorro por periodo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-600">
            {filas.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-2 font-medium text-gray-700 capitalize whitespace-nowrap">
                  {row.periodo}
                </td>
                <td className="py-3 px-2">
                  {row.consumoHistorico > 0 ? `${row.consumoHistorico.toLocaleString('es-MX')} kWh` : '-'}
                </td>
                <td className="py-3 px-2">
                  {row.energiaGenerada > 0 ? `${row.energiaGenerada.toLocaleString('es-MX')} kWh` : '-'}
                </td>
                <td className="py-3 px-2 font-medium">
                  {row.diferencia !== 0 ? (
                    <span className={row.diferencia < 0 ? 'text-[#2dd4bf]' : 'text-gray-600'}>
                      {row.diferencia < 0 ? `${row.diferencia.toLocaleString('es-MX')} kWh` : `+${row.diferencia.toLocaleString('es-MX')} kWh`}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-2">
                  {row.nuevoConsumo !== 0 ? `${row.nuevoConsumo.toLocaleString('es-MX')} kWh` : '0 kWh'}
                </td>
                <td className="py-3 px-2">
                  {row.bancoSolar > 0 ? `${row.bancoSolar.toLocaleString('es-MX')} kWh` : '0 kWh'}
                </td>
                <td className="py-3 px-2 font-medium">
                  {row.pagoHistorico > 0 ? formatearMoneda(row.nuevoPagoCFE) : '-'}
                </td>
                <td className="py-3 px-2 font-medium">
                  {row.pagoHistorico > 0 ? formatearMoneda(row.pagoHistorico) : '-'}
                </td>
                <td className="py-3 px-2 font-bold text-[#2dd4bf]">
                  {row.ahorroPeriodo > 0 ? formatearMoneda(row.ahorroPeriodo) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/40 font-bold">
              <td colSpan={8} className="py-3 px-2 text-gray-700 text-xs md:text-sm">
                Ahorro anual
              </td>
              <td className="py-3 px-2 font-bold text-[#2dd4bf] text-xs md:text-sm">
                {formatearMoneda(ahorroAnualTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
