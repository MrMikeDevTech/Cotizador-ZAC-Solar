'use client';

import { useEffect, useState } from 'react';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { api } from '../../../lib/api';

interface Concepto {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
}

interface Factores {
  ivaPorcentaje: number;
  precioPanelDefault: number;
  precioInversorDefault: number;
  [key: string]: unknown;
}

export default function ConfigCotizacion() {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [factores, setFactores] = useState<Factores | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoFactores, setGuardandoFactores] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ conceptos: Concepto[]; factores: Factores }>('/api/config')
      .then((datos) => {
        setConceptos(datos.conceptos);
        setFactores(datos.factores);
      })
      .catch(() => setMensaje('No se pudo conectar con el backend local.'))
      .finally(() => setCargando(false));
  }, []);

  const guardarConcepto = async (concepto: Concepto) => {
    await api.put(`/api/config/conceptos/${concepto.id}`, {
      concepto: concepto.concepto,
      costoBase: concepto.costoBase,
      margenPorcentaje: concepto.margenPorcentaje,
    });
    setMensaje(`Concepto "${concepto.concepto}" guardado.`);
  };

  const eliminarConcepto = async (id: string) => {
    await api.del(`/api/config/conceptos/${id}`);
    setConceptos((prev) => prev.filter((c) => c.id !== id));
  };

  const agregarConcepto = async () => {
    const nuevo = await api.post<Concepto>('/api/config/conceptos', {
      concepto: 'Nuevo concepto',
      costoBase: 0,
      margenPorcentaje: 0,
      orden: conceptos.length,
      activo: true,
    });
    setConceptos((prev) => [...prev, nuevo]);
  };

  const guardarFactores = async () => {
    if (!factores) return;
    setGuardandoFactores(true);
    try {
      const actualizado = await api.put<Factores>('/api/config/factores', factores);
      setFactores(actualizado);
      setMensaje('Precios y ajustes guardados.');
    } catch {
      setMensaje('No se pudo guardar.');
    } finally {
      setGuardandoFactores(false);
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
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <h2 className="text-2xl font-bold text-[#00388d]">Formato de cotización</h2>
        {mensaje && <p className="text-xs text-teal-600">{mensaje}</p>}

        <Card title="Precios sugeridos y ajustes generales">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio sugerido por panel (MXN)</label>
              <input
                type="number"
                value={factores.precioPanelDefault}
                onChange={(e) => setFactores({ ...factores, precioPanelDefault: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio sugerido por inversor (MXN)</label>
              <input
                type="number"
                value={factores.precioInversorDefault}
                onChange={(e) => setFactores({ ...factores, precioInversorDefault: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">IVA (%)</label>
              <input
                type="number"
                value={factores.ivaPorcentaje}
                onChange={(e) => setFactores({ ...factores, ivaPorcentaje: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={guardarFactores}
              disabled={guardandoFactores}
              className="bg-[#f7931e] text-white px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {guardandoFactores ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </Card>

        <Card title="Conceptos por defecto de la cotización">
          <div className="space-y-3">
            {conceptos.map((concepto) => (
              <div key={concepto.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center border-b border-gray-50 pb-3">
                <input
                  value={concepto.concepto}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, concepto: e.target.value } : c)))}
                  className="md:col-span-2 border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={concepto.costoBase}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, costoBase: Number(e.target.value) } : c)))}
                  placeholder="Costo base"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={concepto.margenPorcentaje}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, margenPorcentaje: Number(e.target.value) } : c)))}
                  placeholder="Margen %"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => guardarConcepto(concepto)} className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer">Guardar</button>
                  <button type="button" onClick={() => eliminarConcepto(concepto.id)} className="text-xs border border-red-300 text-red-500 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer">Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarConcepto} className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer">+ Agregar concepto</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
