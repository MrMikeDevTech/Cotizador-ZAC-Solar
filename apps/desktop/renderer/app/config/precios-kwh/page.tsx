'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { Icono } from '../../components/Icono';
import { api } from '../../../lib/api';

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

interface DacRates {
  tariffCode: string;
  year: number;
  month: number;
  regions: Array<{
    region: string;
    cargoFijo: number;
    precioKwh: number;
    // Nullable a propósito: CFE solo publica precio de verano en las regiones
    // que distinguen temporada (p. ej. Baja California). En las que no, como
    // Central, viene `null` — el schema lo declara `Float?`.
    precioKwhVerano: number | null;
  }>;
}

const TARIFAS_CFE = ['1', '1A', '1B', '1C', '1D', '1E', '1F', 'DAC'] as const;

export default function PreciosKwh() {
  const [cfeStatus, setCfeStatus] = useState<CfeStatus | null>(null);
  const [tarifaCfeSeleccionada, setTarifaCfeSeleccionada] = useState<string>('1');
  const [anioCfeSeleccionado, setAnioCfeSeleccionado] = useState<number>(new Date().getFullYear());
  const [mesCfeSeleccionado, setMesCfeSeleccionado] = useState<number>(new Date().getMonth() + 1);
  const [tarifasRates, setTarifasRates] = useState<TariffRates | null>(null);
  const [tarifasRatesDac, setTarifasRatesDac] = useState<DacRates | null>(null);
  const [cargandoCfe, setCargandoCfe] = useState(false);
  const [resincronizando, setResincronizando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);

  // Cargar status al montar y luego cargar los datos actuales
  useEffect(() => {
    const cargarStatus = async () => {
      try {
        const datos = await api.get<CfeStatus>('/api/cfe-rates/status');
        setCfeStatus(datos);
      } catch {
        // Sin conectividad a CFE rates, no es crítico
      }
    };

    cargarStatus();
  }, []);

  // Cargar tarifas del mes/año actual al montar
  useEffect(() => {
    cargarTarifasCfe();
  }, []);

  const cargarTarifasCfe = async () => {
    setCargandoCfe(true);
    try {
      if (tarifaCfeSeleccionada === 'DAC') {
        const datos = await api.get<DacRates>(
          `/api/cfe-rates?tariff=${tarifaCfeSeleccionada}&year=${anioCfeSeleccionado}&month=${mesCfeSeleccionado}`
        );
        setTarifasRatesDac(datos);
        setTarifasRates(null);
      } else {
        const datos = await api.get<TariffRates>(
          `/api/cfe-rates?tariff=${tarifaCfeSeleccionada}&year=${anioCfeSeleccionado}&month=${mesCfeSeleccionado}`
        );
        setTarifasRates(datos);
        setTarifasRatesDac(null);
      }
      setDatosCargados(true);
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) {
        // No hay datos para este periodo, no es un error
        setTarifasRates(null);
        setTarifasRatesDac(null);
        setDatosCargados(true);
      } else {
        toast.error('No se pudo cargar las tarifas CFE.');
      }
    } finally {
      setCargandoCfe(false);
    }
  };

  const resincronizar = async () => {
    setResincronizando(true);
    try {
      const resultado = await api.post<{
        ok: boolean;
        saved?: number;
        dacSaved?: number;
        missing?: string[];
        errors?: string[];
        durationMs?: number;
        mensaje?: string;
      }>('/api/cfe-rates/sync', {});

      if (resultado.ok) {
        toast.success(`Sincronización completada. Guardadas: ${resultado.saved || 0} tarifas, ${resultado.dacSaved || 0} DAC.`);
        // Refresca el status y las tarifas actuales
        const nuevoStatus = await api.get<CfeStatus>('/api/cfe-rates/status');
        setCfeStatus(nuevoStatus);
        // Vuelve a cargar las tarifas para mostrar los datos actualizados
        cargarTarifasCfe();
      } else {
        // ok: false es un aviso, no un error crítico (offline-first)
        toast.warning(`Sincronización sin completar: ${resultado.mensaje || 'No se pudo conectar.'}`);
      }
    } catch {
      toast.error('Error al intentar sincronizar. Verifica tu conexión.');
    } finally {
      setResincronizando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <h2 className="text-2xl font-bold text-[#00388d]">Precios de kWh - Tarifas CFE</h2>

        <Card title="Sincronización y consulta">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Última sincronización: {cfeStatus?.lastFetchedAt ? new Date(cfeStatus.lastFetchedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Nunca'}
              </p>
              <button
                type="button"
                onClick={resincronizar}
                disabled={resincronizando}
                className="flex items-center gap-2 bg-[#00388d] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icono icon={RotateCcw} size={14} />
                {resincronizando ? 'Sincronizando...' : 'Resincronizar'}
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tarifa</label>
                <select
                  value={tarifaCfeSeleccionada}
                  onChange={(e) => {
                    setTarifaCfeSeleccionada(e.target.value);
                    setDatosCargados(false);
                  }}
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
                  onChange={(e) => {
                    setAnioCfeSeleccionado(Number(e.target.value));
                    setDatosCargados(false);
                  }}
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
                  onChange={(e) => {
                    setMesCfeSeleccionado(Number(e.target.value));
                    setDatosCargados(false);
                  }}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={cargarTarifasCfe}
                  disabled={cargandoCfe}
                  className="w-full bg-[#f7931e] text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cargandoCfe ? 'Cargando...' : 'Cargar'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabla de tarifas normales (escalones) */}
        {tarifaCfeSeleccionada !== 'DAC' && datosCargados && (
          <Card title={`Tarifa ${tarifaCfeSeleccionada} - ${mesCfeSeleccionado}/${anioCfeSeleccionado}`}>
            {tarifasRates ? (
              <div className="overflow-x-auto">
                {tarifasRates.seasons.map((season) => (
                  <div key={season.season} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-[#00388d] mb-2">
                      {season.season === 'summer' ? 'Verano' : 'Fuera de Verano'}
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1 px-2">Nivel</th>
                          <th className="text-left py-1 px-2">Concepto</th>
                          <th className="text-right py-1 px-2">Precio</th>
                          {season.tiers[0]?.limitKwh !== null && (
                            <th className="text-right py-1 px-2">Límite (kWh)</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {season.tiers.map((tier) => (
                          <tr key={tier.tierIndex} className="border-b border-gray-100">
                            <td className="py-1 px-2 text-gray-600">{tier.tierIndex + 1}</td>
                            <td className="py-1 px-2">{tier.concept}</td>
                            <td className="text-right py-1 px-2 font-semibold">${tier.price.toFixed(4)}</td>
                            {season.tiers[0]?.limitKwh !== null && (
                              <td className="text-right py-1 px-2">{tier.limitKwh ? tier.limitKwh.toFixed(0) : '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">
                No hay datos disponibles para la tarifa {tarifaCfeSeleccionada} en {mesCfeSeleccionado}/{anioCfeSeleccionado}.
              </p>
            )}
          </Card>
        )}

        {/* Tabla de DAC */}
        {tarifaCfeSeleccionada === 'DAC' && datosCargados && (
          <Card title={`Tarifa DAC - ${mesCfeSeleccionado}/${anioCfeSeleccionado}`}>
            {tarifasRatesDac ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-1 px-2">Región</th>
                      <th className="text-right py-1 px-2">Cargo Fijo (MXN)</th>
                      <th className="text-right py-1 px-2">Precio kWh</th>
                      <th className="text-right py-1 px-2">Precio kWh Verano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tarifasRatesDac.regions.map((region) => (
                      <tr key={region.region} className="border-b border-gray-100">
                        <td className="py-1 px-2 font-medium text-gray-800">{region.region}</td>
                        <td className="text-right py-1 px-2">${region.cargoFijo.toFixed(2)}</td>
                        <td className="text-right py-1 px-2 font-semibold">${region.precioKwh.toFixed(4)}</td>
                        <td className="text-right py-1 px-2 font-semibold">
                          {region.precioKwhVerano === null
                            ? <span className="text-gray-400 font-normal">sin temporada</span>
                            : `$${region.precioKwhVerano.toFixed(4)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">
                No hay datos disponibles para la tarifa DAC en {mesCfeSeleccionado}/{anioCfeSeleccionado}.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
