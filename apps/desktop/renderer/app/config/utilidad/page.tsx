'use client';

import { useEffect, useState } from 'react';
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
}

export default function ConfigUtilidad() {
  const [factores, setFactores] = useState<Factores | null>(null);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ factores: Factores; tarifas: Tarifa[]; localidades: Localidad[] }>('/api/config')
      .then((datos) => {
        setFactores(datos.factores);
        setTarifas(datos.tarifas);
        setLocalidades(datos.localidades);
      })
      .catch(() => setMensaje('No se pudo conectar con el backend local.'))
      .finally(() => setCargando(false));
  }, []);

  const guardarFactores = async () => {
    if (!factores) return;
    setGuardando(true);
    try {
      const actualizado = await api.put<Factores>('/api/config/factores', factores);
      setFactores(actualizado);
      setMensaje('Factores de cálculo guardados.');
    } catch {
      setMensaje('No se pudo guardar.');
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
    await api.put(`/api/config/tarifas/${tarifa.id}`, { limiteDac: tarifa.limiteDac });
    setMensaje(`Tarifa ${tarifa.codigo} guardada.`);
  };

  const guardarLocalidad = async (localidad: Localidad) => {
    await api.put(`/api/config/localidades/${localidad.id}`, {
      factorProduccion: localidad.factorProduccion,
      horasSol: localidad.horasSol,
    });
    setMensaje(`${localidad.nombre} guardada.`);
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
        {mensaje && <p className="text-xs text-teal-600">{mensaje}</p>}

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
          <div className="space-y-3">
            {localidades.map((localidad) => (
              <div key={localidad.id} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center border-b border-gray-50 pb-3">
                <span className="text-sm text-gray-600">{localidad.nombre}, {localidad.estado}</span>
                <input
                  type="number"
                  step="0.00001"
                  value={localidad.factorProduccion}
                  onChange={(e) =>
                    setLocalidades((prev) =>
                      prev.map((l) => (l.id === localidad.id ? { ...l, factorProduccion: Number(e.target.value) } : l))
                    )
                  }
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  step="0.1"
                  value={localidad.horasSol}
                  onChange={(e) =>
                    setLocalidades((prev) =>
                      prev.map((l) => (l.id === localidad.id ? { ...l, horasSol: Number(e.target.value) } : l))
                    )
                  }
                  placeholder="Horas sol"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <button
                  type="button"
                  onClick={() => guardarLocalidad(localidad)}
                  className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer justify-self-end"
                >
                  Guardar
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
