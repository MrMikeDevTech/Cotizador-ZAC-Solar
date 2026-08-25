'use client';

import { ConceptoCotizacion, EstructuraInstalacion, CargoEditable, TipoMoneda } from '../../types';

interface TablaCotizacionProps {
  conceptos: ConceptoCotizacion[];
  opcionesAvanzadas: boolean;
  estructuraActual?: EstructuraInstalacion;
  cargosEditables: CargoEditable[];
  tipoMoneda: TipoMoneda;
  setTipoMoneda: (val: TipoMoneda) => void;
  valorDolar: number;
  setValorDolar: (val: number) => void;
  ocultarDesglose: boolean;
  setOcultarDesglose: (val: boolean) => void;
  incluirIva: boolean;
  setIncluirIva: (val: boolean) => void;
  subtotalConDescuento: number;
  granTotal: number;
  utilidadTotalMXN: number;
  porcentajeUtilidadTotal: number;
  onMargenPorcentajeChange: (id: string, nuevoMargen: number) => void;
  onMargenMXNChange: (id: string, nuevoMargenMXN: number) => void;
}

export default function TablaCotizacion({
  conceptos,
  opcionesAvanzadas,
  estructuraActual,
  cargosEditables,
  tipoMoneda,
  setTipoMoneda,
  valorDolar,
  setValorDolar,
  ocultarDesglose,
  setOcultarDesglose,
  incluirIva,
  setIncluirIva,
  subtotalConDescuento,
  granTotal,
  utilidadTotalMXN,
  porcentajeUtilidadTotal,
  onMargenPorcentajeChange,
  onMargenMXNChange,
}: TablaCotizacionProps) {
  const formatCurrency = (val: number): string => {
    return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tipoMoneda}`;
  };

  const calcularTotalConcepto = (item: ConceptoCotizacion): number => {
    return item.costoBase * (1 + item.margenPorcentaje / 100);
  };

  const calcularMargenMXN = (item: ConceptoCotizacion): number => {
    return item.costoBase * (item.margenPorcentaje / 100);
  };

  return (
    <div className="flex flex-col justify-between">
      {/* TARJETA PRINCIPAL DE COTIZACIÓN */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-[#00388d]">Revisa tu cotización</h3>
          <span className="text-xs text-gray-400 font-medium">1.63 dólar por watt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 font-bold">CONCEPTO</th>
                {opcionesAvanzadas && (
                  <>
                    <th className="py-2 text-center font-bold">% MARGEN</th>
                    <th className="py-2 text-right font-bold">MARGEN MXN</th>
                  </>
                )}
                <th className="py-2 text-right font-bold">TOTALES</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold text-gray-700 divide-y divide-gray-100">
              {conceptos.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-gray-600">{item.concepto}</td>
                  {opcionesAvanzadas && (
                    <>
                      <td className="py-3 text-center">
                        <input
                          type="number"
                          value={Number(item.margenPorcentaje.toFixed(2))}
                          onChange={(e) =>
                            onMargenPorcentajeChange(item.id, Number(e.target.value))
                          }
                          className="w-16 border border-gray-300 rounded p-1 text-xs text-center focus:outline-[#00388d] bg-white font-semibold"
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            value={Number(calcularMargenMXN(item).toFixed(2))}
                            onChange={(e) =>
                              onMargenMXNChange(item.id, Number(e.target.value))
                            }
                            className="w-24 border border-gray-300 rounded p-1 text-xs text-right focus:outline-[#00388d] bg-white font-semibold text-gray-700"
                          />
                        </div>
                      </td>
                    </>
                  )}
                  <td className="py-3 text-right font-bold text-gray-700">
                    {formatCurrency(calcularTotalConcepto(item))}
                  </td>
                </tr>
              ))}

              {/* ESTRUCTURA SELECCIONADA */}
              {estructuraActual && (
                <>
                  <tr>
                    <td className="pt-3 pb-1 font-semibold text-gray-600">
                      Precio por tipo de estructura
                    </td>
                    {opcionesAvanzadas && (
                      <>
                        <td className="pt-3 pb-1 text-center text-gray-300">-</td>
                        <td className="pt-3 pb-1 text-right text-gray-300">-</td>
                      </>
                    )}
                    <td className="pt-3 pb-1 text-right font-bold text-gray-700">
                      {formatCurrency(estructuraActual.precio)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={opcionesAvanzadas ? 4 : 2}
                      className="pb-3 pt-0 text-xs font-semibold text-gray-500 pl-3"
                    >
                      <span className="text-[#00388d] mr-1">▶</span> {estructuraActual.nombre}
                    </td>
                  </tr>
                </>
              )}

              {/* CARGOS EDITABLES */}
              {cargosEditables.map(
                (cargo) =>
                  cargo.monto > 0 && (
                    <tr key={cargo.id}>
                      <td className="py-3 font-semibold text-gray-600">
                        {cargo.nombre || 'Otro cargo'}
                      </td>
                      {opcionesAvanzadas && (
                        <>
                          <td className="py-3 text-center text-gray-300">-</td>
                          <td className="py-3 text-right text-gray-300">-</td>
                        </>
                      )}
                      <td className="py-3 text-right font-bold text-gray-700">
                        {formatCurrency(cargo.monto)}
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>

        {opcionesAvanzadas && (
          <div className="flex justify-between items-center py-3 my-2 border-t border-b border-gray-100 text-xs font-bold text-gray-700">
            <span>
              UTILIDAD TOTAL{' '}
              <span className="text-[#2dd4bf] font-normal ml-2">
                {porcentajeUtilidadTotal.toFixed(2)}%
              </span>
            </span>
            <span className="text-[#2dd4bf]">{formatCurrency(utilidadTotalMXN)}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col items-end gap-2 text-right">
          <div className="flex justify-between w-60 text-xs font-semibold">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-gray-700 font-bold">{formatCurrency(subtotalConDescuento)}</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 my-1 select-none">
            <input
              type="checkbox"
              checked={incluirIva}
              onChange={(e) => setIncluirIva(e.target.checked)}
              className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf]"
            />
            I.V.A. 16%
          </label>

          <div className="flex justify-between w-full pt-4 border-t border-gray-100 text-sm font-extrabold mt-2">
            <span className="text-gray-600 text-xs self-center uppercase tracking-wider">
              GRAN TOTAL EN PESOS
            </span>
            <span className="text-[#00388d] text-base">{formatCurrency(granTotal)}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: TIPO DE CAMBIO */}
      <div className="mt-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Tipo de cambio
            </label>
            <select
              value={tipoMoneda}
              onChange={(e) => setTipoMoneda(e.target.value as TipoMoneda)}
              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-700 focus:outline-[#00388d] cursor-pointer"
            >
              <option value="MXN">Peso</option>
              <option value="USD">Dólar</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Valor de cambio del dólar
            </label>
            <input
              type="number"
              value={valorDolar}
              step="0.01"
              onChange={(e) => setValorDolar(Number(e.target.value))}
              className="w-full bg-gray-100 border-none rounded-lg p-2 text-xs font-semibold text-gray-600 focus:outline-[#00388d]"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ocultarDesglose}
              onChange={(e) => setOcultarDesglose(e.target.checked)}
              className="rounded text-[#2dd4bf]"
            />
            Ocultar desglose de cotización
          </label>
        </div>
      </div>
    </div>
  );
}
