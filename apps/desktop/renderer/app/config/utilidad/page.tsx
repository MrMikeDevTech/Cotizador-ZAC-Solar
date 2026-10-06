'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { api } from '../../../lib/api';

interface Factores {
  factorProduccion: number;
  pagoMinimoCfe: number;
  inflacionCfe: number;
  factorCo2: number;
  factorArboles: number;
  factorKmAuto: number;
  areaPorPanel: number;
  factoresEstacionales: number[];
  [key: string]: unknown;
}

interface Tarifa {
  id: string;
  codigo: string;
  limiteDac: number | null;
  esNueva: boolean;
}

interface Localidad {
  id: string;
  estado: string;
  nombre: string;
  factorProduccion: number;
  horasSol: number;
  mesInicioVerano?: number | null;
  regionDac?: string | null;
}

interface CfeStatus {
  lastFetchedAt: string | null;
  totalRows: number;
  periods: Array<{ tariffCode: string; year: number; month: number; season: string; tierCount: number }>;
}

interface TariffRates {
  tariffCode: string;
  year: number;
  month: number;
  seasons: Array<{
    season: string;
    tiers: Array<{ tierIndex: number; concept: string; price: number; description: string; limitKwh: number | null }>;
  }>;
}

const TARIFAS_CFE = ['1', '1A', '1B', '1C', '1D', '1E', '1F'] as const;
const REGIONES_DAC = ['Central', 'Noroeste', 'Norte y Noreste', 'Sur y Peninsular', 'Baja California', 'Baja California Sur'] as const;

export default function ConfigUtilidad() {
  const [factores, setFactores] = useState<Factores | null>(null);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [cfeStatus, setCfeStatus] = useState<CfeStatus | null>(null);
  const [tarifaCfeSeleccionada, setTarifaCfeSeleccionada] = useState<string>('1');
  const [anioCfeSeleccionado, setAnioCfeSeleccionado] = useState<number>(2024);
  const [mesCfeSeleccionado, setMesCfeSeleccionado] = useState<number>(1);
  const [tarifasRates, setTarifasRates] = useState<TariffRates | null>(null);
  const [cargandoCfe, setCargandoCfe] = useState(false);

  useEffect(() => {
    api
      .get<{ factores: Factores; tarifas: Tarifa[]; localidades: Localidad[] }>('/api/config')
      .then((datos) => {
        setFactores(datos.factores);
        setTarifas(datos.tarifas);
        setLocalidades(datos.localidades);
      })
      .catch(() => {
        toast.error('No se pudo conectar con el backend local.');
      })
      .finally(() => setCargando(false));

    api
      .get<CfeStatus>('/api/cfe-rates/status')
      .then((datos) => setCfeStatus(datos))
      .catch(() => {
        // Sin conectividad a CFE rates, no es crítico
      });
  }, []);

  const cargarTarifasCfe = async () => {
    setCargandoCfe(true);
    try {
      const datos = await api.get<TariffRates>(
        `/api/cfe-rates?tariff=${tarifaCfeSeleccionada}&year=${anioCfeSeleccionado}&month=${mesCfeSeleccionado}`
      );
      setTarifasRates(datos);
    } catch {
      toast.error('No se pudo cargar las tarifas CFE.');
    } finally {
      setCargandoCfe(false);
    }
  };

  const guardarFactores = async () => {
    if (!factores) return;
    setGuardando(true);
    try {
      const actualizado = await api.put<Factores>('/api/config/factores', factores);
      setFactores(actualizado);
      toast.success('Factores de cálculo guardados.');
    } catch {
      toast.error('No se pudo guardar los factores.');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarFactorEstacional = (index: number, valor: number) => {
    if (!factores) return;
    const factoresEstacionales = [...factores.factoresEstacionales];
    factoresEstacionales[index] = valor;
    setFactores({ ...factores, factoresEstacionales });
  };

  const guardarTarifa = async (tarifa: Tarifa) => {
    try {
      await api.put(`/api/config/tarifas/${tarifa.id}`, { limiteDac: tarifa.limiteDac });
      toast.success(`Tarifa ${tarifa.codigo} guardada.`);
    } catch {
      toast.error(`No se pudo guardar la tarifa ${tarifa.codigo}.`);
    }
  };

  const guardarLocalidad = async (localidad: Localidad) => {
    try {
      await api.put(`/api/config/localidades/${localidad.id}`, {
        factorProduccion: localidad.factorProduccion,
        horasSol: localidad.horasSol,
        mesInicioVerano: localidad.mesInicioVerano ?? null,
        regionDac: localidad.regionDac ?? null,
      });
      toast.success(`${localidad.nombre} guardada.`);
    } catch {
      toast.error(`No se pudo guardar ${localidad.nombre}.`);
    }
  };

  if (cargando || !factores) {
    return (
      <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 flex justify-center">
        <p className="text-sm text-white">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <h2 className="text-2xl font-bold text-[#00388d]">Factores de cálculo</h2>

        <Card title="Factores generales">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Factor de producción por defecto (kWh/watt/periodo)</label>
              <input
                type="number"
                step="0.00001"
                value={factores.factorProduccion}
                onChange={(e) => setFactores({ ...factores, factorProduccion: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pago mínimo CFE (MXN)</label>
              <input
                type="number"
                value={factores.pagoMinimoCfe}
                onChange={(e) => setFactores({ ...factores, pagoMinimoCfe: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Inflación anual CFE (%, ej. 0.04 = 4%)</label>
              <input
                type="number"
                step="0.001"
                value={factores.inflacionCfe}
                onChange={(e) => setFactores({ ...factores, inflacionCfe: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Factor CO2 (kg/kWh)</label>
              <input
                type="number"
                step="0.001"
                value={factores.factorCo2}
                onChange={(e) => setFactores({ ...factores, factorCo2: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Factor árboles (por kg CO2)</label>
              <input
                type="number"
                step="0.001"
                value={factores.factorArboles}
                onChange={(e) => setFactores({ ...factores, factorArboles: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Factor km auto (por kg CO2)</label>
              <input
                type="number"
                step="0.001"
                value={factores.factorKmAuto}
                onChange={(e) => setFactores({ ...factores, factorKmAuto: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Área por panel (m²)</label>
              <input
                type="number"
                step="0.001"
                value={factores.areaPorPanel}
                onChange={(e) => setFactores({ ...factores, areaPorPanel: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
          </div>

          <div className="pt-6">
            <label className="block text-xs text-gray-400 mb-2">Factores estacionales (6 bimestres, más reciente primero)</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {factores.factoresEstacionales.map((valor, i) => (
                <input
                  key={i}
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => actualizarFactorEstacional(i, Number(e.target.value))}
                  className="w-full border-b border-gray-300 py-2 text-sm text-center focus:outline-none focus:border-[#00388d]"
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={guardarFactores}
              disabled={guardando}
              className="bg-[#f7931e] text-white px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </Card>

        <Card title="Precios de tarifas CFE (sincronización automática)">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Última sincronización: {cfeStatus?.lastFetchedAt ? new Date(cfeStatus.lastFetchedAt).toLocaleDateString('es-MX') : 'Nunca'}
              </p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tarifa</label>
                <select
                  value={tarifaCfeSeleccionada}
                  onChange={(e) => setTarifaCfeSeleccionada(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                >
                  {TARIFAS_CFE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Año</label>
                <input
                  type="number"
                  value={anioCfeSeleccionado}
                  onChange={(e) => setAnioCfeSeleccionado(Number(e.target.value))}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Mes</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={mesCfeSeleccionado}
                  onChange={(e) => setMesCfeSeleccionado(Number(e.target.value))}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={cargarTarifasCfe}
                  disabled={cargandoCfe}
                  className="w-full bg-[#00388d] text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cargandoCfe ? 'Cargando…' : 'Cargar'}
                </button>
              </div>
            </div>

            {tarifasRates && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-700 mb-3">
                  {tarifasRates.tariffCode} - {tarifasRates.month}/{tarifasRates.year}
                </p>
                {tarifasRates.seasons.map((season) => (
                  <div key={season.season} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-[#00388d] mb-2">{season.season === 'summer' ? 'Verano' : 'Fuera de Verano'}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1 px-1">Nivel</th>
                          <th className="text-left py-1 px-1">Concepto</th>
                          <th className="text-right py-1 px-1">Precio</th>
                          {season.tiers[0]?.limitKwh !== null && <th className="text-right py-1 px-1">Límite (kWh)</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {season.tiers.map((tier) => (
                          <tr key={tier.tierIndex} className="border-b border-gray-100">
                            <td className="py-1 px-1 text-gray-600">{tier.tierIndex + 1}</td>
                            <td className="py-1 px-1">{tier.concept}</td>
                            <td className="text-right py-1 px-1 font-semibold">${tier.price.toFixed(4)}</td>
                            {season.tiers[0]?.limitKwh !== null && (
                              <td className="text-right py-1 px-1">{tier.limitKwh ? tier.limitKwh.toFixed(0) : '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Límites DAC por tarifa CFE">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tarifas.map((tarifa) => (
              <div key={tarifa.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-sm font-semibold text-[#00388d]">{tarifa.codigo}</span>
                <input
                  type="number"
                  value={tarifa.limiteDac ?? ''}
                  placeholder="Sin límite"
                  onChange={(e) =>
                    setTarifas((prev) =>
                      prev.map((t) => (t.id === tarifa.id ? { ...t, limiteDac: e.target.value === '' ? null : Number(e.target.value) } : t))
                    )
                  }
                  onBlur={() => guardarTarifa(tarifas.find((t) => t.id === tarifa.id)!)}
                  className="w-20 border-b border-gray-300 py-1 text-sm text-right focus:outline-none focus:border-[#00388d]"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Factor de producción por localidad">
          <div className="space-y-4">
            {localidades.map((localidad) => (
              <div key={localidad.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start border-b border-gray-50 pb-4">
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-600 font-semibold mb-2">
                    {localidad.nombre}, {localidad.estado}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Factor producción</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={localidad.factorProduccion}
                        onChange={(e) =>
                          setLocalidades((prev) =>
                            prev.map((l) => (l.id === localidad.id ? { ...l, factorProduccion: Number(e.target.value) } : l))
                          )
                        }
                        className="w-full border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                      />
                      <p className="text-xs text-gray-400 mt-1">Productividad solar según la localidad</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Horas de sol</label>
                      <input
                        type="number"
                        step="0.1"
                        value={localidad.horasSol}
                        onChange={(e) =>
                          setLocalidades((prev) =>
                            prev.map((l) => (l.id === localidad.id ? { ...l, horasSol: Number(e.target.value) } : l))
                          )
                        }
                        className="w-full border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                      />
                      <p className="text-xs text-gray-400 mt-1">Promedio de horas útiles de luz solar</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mes inicio verano (2-5)</label>
                    <input
                      type="number"
                      min="2"
                      max="5"
                      value={localidad.mesInicioVerano ?? ''}
                      onChange={(e) =>
                        setLocalidades((prev) =>
                          prev.map((l) =>
                            l.id === localidad.id ? { ...l, mesInicioVerano: e.target.value === '' ? null : Number(e.target.value) } : l
                          )
                        )
                      }
                      placeholder="(Opcional)"
                      className="w-full border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Mes en que comienza la tarifa de verano CFE</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Región DAC</label>
                    <select
                      value={localidad.regionDac ?? ''}
                      onChange={(e) =>
                        setLocalidades((prev) =>
                          prev.map((l) => (l.id === localidad.id ? { ...l, regionDac: e.target.value || null } : l))
                        )
                      }
                      className="w-full border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                    >
                      <option value="">Sin asignar</option>
                      {REGIONES_DAC.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Región tarifaria para DAC</p>
                  </div>
                </div>

                <div className="flex justify-end md:mt-auto">
                  <button
                    type="button"
                    onClick={() => guardarLocalidad(localidad)}
                    className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1.5 rounded-full hover:bg-teal-50 cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
