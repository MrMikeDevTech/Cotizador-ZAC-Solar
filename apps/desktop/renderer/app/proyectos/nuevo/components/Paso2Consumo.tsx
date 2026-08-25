'use client';

import { useEffect } from 'react';
import { ConsumoPeriodo } from '../types';
import { tarifasClasicas, tarifasNuevas, opcionesHilos } from '../constants';
import GraficaConsumo from './charts/GraficaConsumo';

interface Paso2ConsumoProps {
  nombreProyecto?: string;
  setNombreProyecto?: (val: string) => void;
  nombreRecibo?: string;
  setNombreRecibo?: (val: string) => void;
  numeroServicio?: string;
  setNumeroServicio?: (val: string) => void;
  ivaCFE?: number;
  setIvaCFE?: (val: number) => void;
  porcentajeDap?: string;
  setPorcentajeDap?: (val: string) => void;
  localidadConsumo?: string;
  setLocalidadConsumo?: (val: string) => void;
  hilos?: string;
  setHilos?: (val: string) => void;
  
  usarNuevaTarifa: boolean;
  setUsarNuevaTarifa: (val: boolean) => void;
  tarifaSeleccionada: string;
  setTarifaSeleccionada: (val: string) => void;
  aplicarDac: boolean;
  setAplicarDac: (val: boolean) => void;
  aplicarDap: boolean;
  setAplicarDap: (val: boolean) => void;
  fechaTexto: string;
  setFechaTexto: (val: string) => void;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  periodo: string;
  setPeriodo: (val: string) => void;
  consumos: ConsumoPeriodo[];
  setConsumos: React.Dispatch<React.SetStateAction<ConsumoPeriodo[]>>;
  
  onAnterior: () => void;
  onSiguiente: () => void;
}

export default function Paso2Consumo({
  nombreProyecto = '',
  setNombreProyecto,
  nombreRecibo = '',
  setNombreRecibo,
  numeroServicio = '',
  setNumeroServicio,
  ivaCFE = 16,
  setIvaCFE,
  porcentajeDap = '',
  setPorcentajeDap,
  localidadConsumo = 'Nayarit - Compostela',
  setLocalidadConsumo,
  hilos = '1 hilo',
  setHilos,
  usarNuevaTarifa,
  setUsarNuevaTarifa,
  tarifaSeleccionada,
  setTarifaSeleccionada,
  aplicarDac,
  setAplicarDac,
  aplicarDap,
  setAplicarDap,
  fechaTexto,
  setFechaTexto,
  fechaInicio,
  setFechaInicio,
  periodo,
  setPeriodo,
  consumos,
  setConsumos,
  onAnterior,
  onSiguiente,
}: Paso2ConsumoProps) {

  useEffect(() => {
    setTarifaSeleccionada(usarNuevaTarifa ? 'PDBT' : '1A');
  }, [usarNuevaTarifa, setTarifaSeleccionada]);

  const handleFechaTextoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);

    setFechaTexto(val);

    if (val.length === 10) {
      const [day, month, year] = val.split('/');
      setFechaInicio(`${year}-${month}-${day}`);
    } else {
      setFechaInicio('');
    }
  };

  useEffect(() => {
    if (!fechaInicio || fechaInicio.length < 10) return;

    const [year, month] = fechaInicio.split('-');
    const startYear = parseInt(year);
    const startMonth = parseInt(month) - 1;

    const step = periodo === 'Bimestral' ? 2 : 1;

    setConsumos((prev) => {
      const nuevos = [...prev];
      for (let i = 0; i < 6; i++) {
        const dateStart = new Date(startYear, startMonth - i * step, 15);
        const dateEnd = new Date(startYear, startMonth - i * step + step, 15);

        const sMonth = dateStart.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
        const sYear = dateStart.getFullYear();

        const eMonth = dateEnd.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
        const eYear = dateEnd.getFullYear();

        nuevos[i] = {
          ...nuevos[i],
          inicioStr: `${sMonth} ${sYear}`,
          terminoStr: `${eMonth} ${eYear}`,
        };
      }
      return nuevos;
    });
  }, [fechaInicio, periodo, setConsumos]);

  const handleConsumoChange = (index: number, campo: 'kwh' | 'pago', valor: string) => {
    setConsumos((prev) => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], [campo]: valor };
      return nuevos;
    });
  };

  return (
    <form className="space-y-10 animate-fade-in pt-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Nombre del proyecto</label>
          <input
            type="text"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto?.(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={usarNuevaTarifa}
              onChange={(e) => setUsarNuevaTarifa(e.target.checked)}
              className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
            />
            <span className="text-xs text-gray-500">Usar nueva tarifa</span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Localidad</label>
          <select
            value={localidadConsumo}
            onChange={(e) => setLocalidadConsumo?.(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="Nayarit - Compostela">Nayarit - Compostela</option>
            <option value="Jalisco - Guadalajara">Jalisco - Guadalajara</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-12">
        <div className="w-40">
          <label className="block text-xs font-bold text-gray-400 mb-1">Tarifa CFE</label>
          <select
            value={tarifaSeleccionada}
            onChange={(e) => setTarifaSeleccionada(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            {(usarNuevaTarifa ? tarifasNuevas : tarifasClasicas).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-xs font-bold text-gray-400 mb-1">Número de hilos</label>
          <select
            value={hilos}
            onChange={(e) => setHilos?.(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            {opcionesHilos.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aplicarDac}
              onChange={(e) => setAplicarDac(e.target.checked)}
              className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
            />
            <span className="text-xs text-gray-500">Aplicar DAC</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">
              Nombre que aparece en el recibo
            </label>
            <input
              type="text"
              value={nombreRecibo}
              onChange={(e) => setNombreRecibo?.(e.target.value)}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Número de servicio</label>
            <input
              type="text"
              value={numeroServicio}
              onChange={(e) => setNumeroServicio?.(e.target.value)}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
          </div>
        </div>
        <div className="flex pb-2">
          <button
            type="button"
            className="bg-[#00388d] hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all text-sm cursor-pointer"
          >
            Obtener Consumos de CFE
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-12">
        <div className="w-40 relative">
          <label className="block text-xs font-bold text-gray-400 mb-1">IVA de CFE</label>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <input
              type="number"
              value={ivaCFE}
              onChange={(e) => setIvaCFE?.(Number(e.target.value))}
              className="w-full py-2 px-3 text-sm focus:outline-none"
            />
            <div className="bg-[#00388d] text-white flex items-center justify-center px-3 font-bold">
              %
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aplicarDap}
              onChange={(e) => setAplicarDap(e.target.checked)}
              className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
            />
            <span className="text-xs text-gray-500 leading-tight">
              Aplicar<br />DAP
            </span>
          </label>

          {aplicarDap && (
            <div className="w-24">
              <label className="block text-xs font-bold text-gray-400 mb-1 text-center">% DAP</label>
              <input
                type="number"
                value={porcentajeDap}
                onChange={(e) => setPorcentajeDap?.(e.target.value)}
                className="w-full border-b border-gray-300 py-1 text-center text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-100" />

      <div className="flex flex-wrap gap-12">
        <div className="w-64">
          <label className="block text-xs font-bold text-gray-500 mb-1">
            Inicio del último periodo (DD/MM/AAAA)
          </label>
          <input
            type="text"
            autoComplete="off"
            placeholder="Ej: 07/04/2026"
            maxLength={10}
            value={fechaTexto}
            onChange={handleFechaTextoChange}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
        <div className="w-64">
          <label className="block text-xs font-bold text-gray-500 mb-1">Periodo</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="Bimestral">Bimestral</option>
            <option value="Mensual">Mensual</option>
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto mt-4">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 font-bold border-b border-gray-200">
            <tr>
              <th className="py-4 w-[25%]">Inicio</th>
              <th className="py-4 w-[25%]">Término</th>
              <th className="py-4 w-[25%] text-center">kWh</th>
              <th className="py-4 w-[25%] text-right">Pago a CFE</th>
            </tr>
          </thead>
          <tbody>
            {consumos.map((row, index) => (
              <tr key={index} className="border-b border-gray-50">
                <td className="py-4 text-gray-600 capitalize">{row.inicioStr || '---'}</td>
                <td className="py-4 text-gray-600 capitalize">{row.terminoStr || '---'}</td>
                <td className="py-3">
                  <div className="flex justify-center">
                    <input
                      type="number"
                      value={row.kwh}
                      onChange={(e) => handleConsumoChange(index, 'kwh', e.target.value)}
                      className="w-32 border border-gray-200 rounded px-3 py-2 text-center focus:outline-none focus:border-[#00388d]"
                    />
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex justify-end items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      value={row.pago}
                      onChange={(e) => handleConsumoChange(index, 'pago', e.target.value)}
                      className="w-32 border border-gray-200 rounded px-3 py-2 text-right focus:outline-none focus:border-[#00388d]"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="border-gray-100 my-8" />

      <div className="w-full">
        <h3 className="text-center font-bold text-gray-600 mb-1">Consumo histórico</h3>
        <p className="text-center text-xs text-gray-400 mb-8 capitalize">
          {consumos[5]?.inicioStr
            ? `${consumos[5].inicioStr} - ${consumos[0]?.terminoStr}`
            : 'Ingrese fecha para ver periodo'}
        </p>

        <GraficaConsumo consumos={consumos} tarifaSeleccionada={tarifaSeleccionada} />
      </div>

      <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          Regresar a Contacto
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Guardar y continuar a Equipo
        </button>
      </div>
    </form>
  );
}
