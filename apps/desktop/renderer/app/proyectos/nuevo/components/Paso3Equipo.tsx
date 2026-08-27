'use client';

import { ConsumoPeriodo } from '../types';
import { panelesData, inversoresData } from '../constants';
import GraficaProyeccion from './charts/GraficaProyeccion';

interface Paso3EquipoProps {
  panelKey: string;
  setPanelKey: (val: string) => void;
  cantPaneles: number | '';
  setCantPaneles: (val: number | '') => void;
  inversorKey: string;
  setInversorKey: (val: string) => void;
  cantInversores: number | '';
  setCantInversores: (val: number | '') => void;

  tamanoSistema: number;
  produccion: number;
  autoconsumo: number;
  nuevoPago: number;
  ahorro: number;
  pagoPromedioCFE: number;
  consumos: ConsumoPeriodo[];

  onAnterior: () => void;
  onSiguiente: () => void;
}

export default function Paso3Equipo({
  panelKey,
  setPanelKey,
  cantPaneles,
  setCantPaneles,
  inversorKey,
  setInversorKey,
  cantInversores,
  setCantInversores,
  tamanoSistema,
  produccion,
  autoconsumo,
  nuevoPago,
  ahorro,
  pagoPromedioCFE,
  consumos,
  onAnterior,
  onSiguiente,
}: Paso3EquipoProps) {
  return (
    <form className="space-y-10 animate-fade-in pt-4" onSubmit={(e) => e.preventDefault()}>
      {/* Barra de progreso de Autoconsumo */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <span className="text-sm font-bold text-gray-400">Porcentaje de autoconsumo</span>
          <div className="text-[#2dd4bf] font-bold text-xl w-24 text-right">
            {autoconsumo.toFixed(2)}%
          </div>
        </div>

        <div className="relative w-full h-3 bg-gray-200 rounded-full">
          <div
            className="bg-[#2dd4bf] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(autoconsumo, 100)}%` }}
          />
          <div
            className="absolute -top-8 bg-[#2dd4bf] text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center justify-center transition-all duration-500 ease-out z-10"
            style={{
              left: `${Math.min(autoconsumo, 100)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.min(autoconsumo, 100).toFixed(0)}%
            <div className="absolute -bottom-1 w-2 h-2 bg-[#2dd4bf] rotate-45" />
          </div>
        </div>
      </div>

      <hr className="border-gray-100 mb-8" />

      {/* Configuración de Paneles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 mb-1">Modelo del panel</label>
          <select
            value={panelKey}
            onChange={(e) => setPanelKey(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="" disabled hidden>
              Selecciona un panel...
            </option>
            {Object.entries(panelesData).map(([key, data]) => (
              <option key={key} value={key}>
                {data.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={cantPaneles}
            onChange={(e) => setCantPaneles(e.target.value !== '' ? Number(e.target.value) : '')}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Tamaño del sistema</label>
          <div className="w-full border-b border-gray-300 py-2 text-sm text-gray-800 h-9 flex items-center">
            {tamanoSistema > 0 ? `${tamanoSistema.toLocaleString('en-US')} watt` : ''}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">
            Producción del sistema
          </label>
          <div className="w-full border-b border-gray-300 py-2 text-sm text-gray-800 h-9 flex items-center">
            {produccion > 0 ? `${produccion.toFixed(2)} kWh/periodo` : ''}
          </div>
        </div>
      </div>

      {/* Configuración de Inversores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 mb-1">Tipo de inversor</label>
          <select
            value={inversorKey}
            onChange={(e) => setInversorKey(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="" disabled hidden>
              Selecciona un inversor...
            </option>
            {Object.entries(inversoresData).map(([key, data]) => (
              <option key={key} value={key}>
                {data.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={cantInversores}
            onChange={(e) =>
              setCantInversores(e.target.value !== '' ? Number(e.target.value) : '')
            }
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>

        <div>
          <button
            type="button"
            className="border border-[#00388d] text-[#00388d] hover:bg-blue-50 px-6 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer"
          >
            Actualizar
          </button>
        </div>

        <div className="text-right">
          <button
            type="button"
            className="text-[#00388d] border border-transparent hover:border-[#00388d] px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer"
          >
            Configuraciones avanzadas
          </button>
        </div>
      </div>

      {/* Resumen Comparativo de Costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs text-gray-400 mb-4 font-semibold uppercase">Sin paneles</h4>
          <p className="text-xs text-gray-400 mb-1">Pago promedio por periodo a CFE</p>
          <p className="text-2xl font-bold text-gray-600">${pagoPromedioCFE.toFixed(2)}</p>
        </div>

        <div className="md:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs text-gray-400 mb-4 font-semibold uppercase">Con paneles</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Pago promedio con paneles</p>
              <p className="text-2xl font-bold text-gray-600">${nuevoPago.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Ahorro por periodo</p>
              <p className="text-2xl font-bold text-[#2dd4bf]">${ahorro.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Autoconsumo</p>
              <p className="text-2xl font-bold text-[#2dd4bf]">{autoconsumo.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100 my-8" />

      {/* Gráfica de Proyección de Pagos */}
      <div className="w-full">
        <h3 className="text-center font-bold text-gray-600 mb-1">Proyección de pagos</h3>
        <p className="text-center text-xs text-gray-400 mb-8 capitalize">
          {consumos[5]?.inicioStr
            ? `${consumos[5].inicioStr} - ${consumos[0]?.terminoStr}`
            : 'Periodo de pagos'}
        </p>

        <GraficaProyeccion consumos={consumos} autoconsumo={autoconsumo} ahorro={ahorro} />
      </div>

      <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          Regresar a Consumo
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Guardar y continuar a Otros cargos
        </button>
      </div>
    </form>
  );
}
