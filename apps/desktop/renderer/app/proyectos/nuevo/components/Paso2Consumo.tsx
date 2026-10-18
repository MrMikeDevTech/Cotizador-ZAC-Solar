'use client';

import { useEffect, useMemo } from 'react';
import { Info, Loader2, TriangleAlert } from 'lucide-react';
import { calcularPagoRecibo } from '@cotizador/shared';
import type { EscalonTarifa } from '@cotizador/shared';
import { ConsumoPeriodo } from '../types';
import { tarifasClasicas, tarifasNuevas, opcionesHilos } from '../constants';
import GraficaConsumo from './charts/GraficaConsumo';
import { Icono } from '../../../components/Icono';
import { useConfiguracion } from '../../../../lib/ConfiguracionContext';

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

  calcularPagoAuto: boolean;
  setCalcularPagoAuto: (val: boolean) => void;
  /** Escalones reales de CFE por periodo, alineados por índice con `consumos`. `null`/`undefined` = sin tarifa real. */
  escalonesPorPeriodo: Array<EscalonTarifa[] | null>;
  pagoMinimoCfe: number;
  /** `true` mientras se resuelven las tarifas contra el backend. */
  cargandoTarifas: boolean;
  /**
   * `true` solo si todos los periodos usan las cuotas de su mes exacto. Con
   * `false` el cálculo salió de los últimos precios publicados, que es el
   * caso normal: CFE no publica todos los meses de todas las temporadas.
   */
  tarifasDelPeriodo: boolean;

  onAnterior: () => void;
  onSiguiente: () => void;
  /** Guarda como borrador sin salir del paso. */
  onGuardar?: () => void;
  guardando?: boolean;
}

/** Importe con separador de miles y dos decimales. Cadena vacía se deja vacía. */
function formatearImporte(valor: string): string {
  const n = Number(valor);
  if (valor === '' || !Number.isFinite(n)) return valor;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Paso2Consumo({
  nombreProyecto = '',
  setNombreProyecto,
  nombreRecibo = '',
  setNombreRecibo,
  numeroServicio = '',
  setNumeroServicio,
  ivaCFE = 0,
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
  calcularPagoAuto,
  setCalcularPagoAuto,
  escalonesPorPeriodo,
  pagoMinimoCfe,
  cargandoTarifas,
  tarifasDelPeriodo,
  onAnterior,
  onSiguiente,
  onGuardar,
  guardando = false,
}: Paso2ConsumoProps) {

  // Estado y municipio son dos selectores, pero se siguen guardando como un
  // solo texto "Estado - Municipio": es el formato que `useTarifasCfe` usa
  // para resolver la localidad contra el catálogo, y el que ya tienen los
  // proyectos guardados. Partirlo también en el almacenamiento habría roto
  // ambas cosas sin ganar nada.
  const { localidades } = useConfiguracion();

  const estadosDisponibles = useMemo(
    () => [...new Set(localidades.map((l) => l.estado))].sort((a, b) => a.localeCompare(b, 'es')),
    [localidades]
  );

  const [estadoGuardado = '', municipioGuardado = ''] = localidadConsumo.split(' - ');
  // Si el estado guardado ya no existe en el catálogo (p. ej. se renombró),
  // se cae al primero disponible en vez de dejar el selector en blanco.
  const estadoSeleccionado = estadosDisponibles.includes(estadoGuardado)
    ? estadoGuardado
    : (estadosDisponibles[0] ?? '');

  const municipiosDelEstado = useMemo(
    () =>
      localidades
        .filter((l) => l.estado === estadoSeleccionado)
        .map((l) => l.nombre)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [localidades, estadoSeleccionado]
  );

  const municipioSeleccionado = municipiosDelEstado.includes(municipioGuardado)
    ? municipioGuardado
    : (municipiosDelEstado[0] ?? '');

  /** Al cambiar de estado se salta a su primer municipio: el anterior no existe ahí. */
  const cambiarEstado = (estado: string) => {
    const primero = localidades
      .filter((l) => l.estado === estado)
      .map((l) => l.nombre)
      .sort((a, b) => a.localeCompare(b, 'es'))[0];
    setLocalidadConsumo?.(primero ? `${estado} - ${primero}` : estado);
  };

  useEffect(() => {
    setTarifaSeleccionada(usarNuevaTarifa ? 'PDBT' : '1A');
  }, [usarNuevaTarifa, setTarifaSeleccionada]);

  // Periodos que sí tienen tarifa real descargada. El cálculo es **por
  // periodo**, no todo o nada: exigir los 6 dejaba el check permanentemente
  // deshabilitado, porque la sincronización solo baja el mes en curso y un
  // historial de consumo se remonta un año atrás. Se calcula lo que se puede
  // y el resto queda a mano, dicho claramente.
  const periodosConTarifa = escalonesPorPeriodo.filter((e) => e != null).length;
  const hayAlgunaTarifa = periodosConTarifa > 0;

  // El check expresa **intención**, no disponibilidad: viene activado y solo
  // cambia si lo tocas. Antes se auto-desmarcaba cuando faltaban tarifas, lo
  // que obligaba a volver a marcarlo en cuanto llegaban — justo el "tener que
  // hacer algo" que debe evitarse. Si no hay tarifa para un periodo, esa fila
  // simplemente queda a mano y se dice por qué.

  // Con el check marcado, el "Pago a CFE" de cada fila se recalcula con la
  // tarifa escalonada real (packages/shared: calcularPagoRecibo) y se
  // escribe directamente a `consumos[i].pago`, que es lo que leen los
  // Pasos 3, 4 y 5 para promedios y retorno de inversión.
  useEffect(() => {
    if (!calcularPagoAuto) return;

    setConsumos((prev) => {
      let cambio = false;
      const nuevos = prev.map((row, i) => {
        const escalones = escalonesPorPeriodo[i];
        if (!escalones) return row;

        const resultado = calcularPagoRecibo({
          consumoKwh: Number(row.kwh) || 0,
          escalones,
          pagoMinimo: pagoMinimoCfe,
          ivaPct: ivaCFE,
          dapPct: aplicarDap ? Number(porcentajeDap) || 0 : 0,
          // Los límites de escalón que publica CFE son mensuales: un recibo
          // bimestral da doble cupo antes de llegar al excedente.
          mesesDelPeriodo: periodo === 'Bimestral' ? 2 : 1,
        });
        const nuevoPago = String(resultado.total);

        if (nuevoPago === row.pago) return row;
        cambio = true;
        return { ...row, pago: nuevoPago };
      });

      // Si nada cambió, devolvemos la misma referencia: evita un
      // re-render (y por lo tanto un re-disparo de este efecto) en bucle.
      return cambio ? nuevos : prev;
    });
  }, [calcularPagoAuto, consumos, escalonesPorPeriodo, pagoMinimoCfe, ivaCFE, aplicarDap, porcentajeDap, periodo, setConsumos]);


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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Estado</label>
            <select
              value={estadoSeleccionado}
              onChange={(e) => cambiarEstado(e.target.value)}
              className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
            >
              {estadosDisponibles.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Municipio</label>
            <select
              value={municipioSeleccionado}
              onChange={(e) => setLocalidadConsumo?.(`${estadoSeleccionado} - ${e.target.value}`)}
              className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
            >
              {municipiosDelEstado.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>
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

      <div className="space-y-8 md:max-w-md">
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
        <div className="max-w-sm">
          {/* Nunca deshabilitado: el check dice qué quieres, no si hay datos. */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={calcularPagoAuto}
              onChange={(e) => setCalcularPagoAuto(e.target.checked)}
              className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
            />
            <span className="text-xs text-gray-500">
              Calcular el pago con la tarifa de CFE
            </span>
          </label>

          {calcularPagoAuto && cargandoTarifas && (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5">
              <Icono icon={Loader2} size={13} className="shrink-0 animate-spin" />
              Consultando tarifas…
            </p>
          )}

          {calcularPagoAuto && !cargandoTarifas && hayAlgunaTarifa && !tarifasDelPeriodo && (
            <p className="flex items-start gap-1.5 text-[11px] text-gray-500 mt-1.5 leading-snug">
              <Icono icon={Info} size={13} className="shrink-0 mt-0.5 text-[#00388d]" />
              Calculado con los últimos precios publicados por CFE. Actualízalos en Configuración →
              Precios de kWh.
            </p>
          )}

          {calcularPagoAuto && !cargandoTarifas && !hayAlgunaTarifa && (
            <p className="flex items-start gap-1.5 text-[11px] text-gray-400 mt-1.5 leading-snug">
              <Icono icon={TriangleAlert} size={13} className="shrink-0 mt-0.5" />
              No hay precios de CFE guardados para la tarifa {tarifaSeleccionada}. Descárgalos en
              Configuración → Precios de kWh.
            </p>
          )}
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
                    {/* Solo se bloquea la fila que de verdad se calculó: las que
                        no tienen tarifa real siguen siendo editables a mano.
                        La calculada se pinta como texto y no como input para
                        poder mostrarla con dos decimales y la moneda. */}
                    {calcularPagoAuto && escalonesPorPeriodo[index] != null ? (
                      <div className="w-36 border border-gray-200 bg-gray-100 rounded px-3 py-2 text-right text-gray-500">
                        {formatearImporte(row.pago)}
                        <span className="text-[10px] text-gray-400 ml-1">MXN</span>
                      </div>
                    ) : (
                      <div className="w-36 flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          value={row.pago}
                          onChange={(e) => handleConsumoChange(index, 'pago', e.target.value)}
                          onBlur={(e) => {
                            // Al salir del campo se normaliza a dos decimales,
                            // para que lo capturado a mano y lo calculado se
                            // lean igual.
                            const n = Number(e.target.value);
                            if (e.target.value !== '' && Number.isFinite(n)) {
                              handleConsumoChange(index, 'pago', n.toFixed(2));
                            }
                          }}
                          title={
                            calcularPagoAuto
                              ? 'Sin tarifa de CFE para este periodo: captúralo a mano'
                              : undefined
                          }
                          className={`w-full border rounded px-3 py-2 text-right focus:outline-none ${
                            calcularPagoAuto
                              ? 'border-[#f7931e]/50 focus:border-[#00388d]'
                              : 'border-gray-200 focus:border-[#00388d]'
                          }`}
                        />
                        <span className="text-[10px] text-gray-400 ml-1 shrink-0">MXN</span>
                      </div>
                    )}
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
          onClick={onGuardar}
          disabled={guardando}
          className="border border-[#00388d] text-[#00388d] px-6 py-3 rounded-full text-sm font-bold hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Continuar a Equipo
        </button>
      </div>
    </form>
  );
}
