'use client';

import { useEffect, useState } from 'react';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { api } from '../../../lib/api';

interface Panel {
  id: string;
  clave: string;
  nombre: string;
  watts: number;
  factorBifacial: number;
  precioUnitario: number;
}

interface Inversor {
  id: string;
  clave: string;
  nombre: string;
  wattsMax: number;
  precioUnitario: number;
}

interface Estructura {
  id: string;
  nombre: string;
  precio: number;
}

export default function ConfigCatalogo() {
  const [paneles, setPaneles] = useState<Panel[]>([]);
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [estructuras, setEstructuras] = useState<Estructura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    api
      .get<{ paneles: Panel[]; inversores: Inversor[]; estructuras: Estructura[] }>('/api/config')
      .then((datos) => {
        setPaneles(datos.paneles);
        setInversores(datos.inversores);
        setEstructuras(datos.estructuras);
      })
      .catch(() => setMensaje('No se pudo conectar con el backend local.'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const guardarPanel = async (panel: Panel) => {
    await api.put(`/api/config/paneles/${panel.id}`, {
      nombre: panel.nombre,
      watts: panel.watts,
      factorBifacial: panel.factorBifacial,
      precioUnitario: panel.precioUnitario,
    });
    setMensaje(`Panel "${panel.nombre}" guardado.`);
  };

  const guardarInversor = async (inversor: Inversor) => {
    await api.put(`/api/config/inversores/${inversor.id}`, {
      nombre: inversor.nombre,
      wattsMax: inversor.wattsMax,
      precioUnitario: inversor.precioUnitario,
    });
    setMensaje(`Inversor "${inversor.nombre}" guardado.`);
  };

  const guardarEstructura = async (estructura: Estructura) => {
    await api.put(`/api/config/estructuras/${estructura.id}`, {
      nombre: estructura.nombre,
      precio: estructura.precio,
    });
    setMensaje(`Estructura "${estructura.nombre}" guardada.`);
  };

  const eliminarPanel = async (id: string) => {
    await api.del(`/api/config/paneles/${id}`);
    setPaneles((prev) => prev.filter((p) => p.id !== id));
  };

  const eliminarInversor = async (id: string) => {
    await api.del(`/api/config/inversores/${id}`);
    setInversores((prev) => prev.filter((p) => p.id !== id));
  };

  const eliminarEstructura = async (id: string) => {
    await api.del(`/api/config/estructuras/${id}`);
    setEstructuras((prev) => prev.filter((p) => p.id !== id));
  };

  const agregarPanel = async () => {
    const nuevo = await api.post<Panel>('/api/config/paneles', {
      clave: `panel_${Date.now()}`,
      nombre: 'Nuevo panel',
      watts: 600,
      factorBifacial: 1,
      precioUnitario: 4400,
      activo: true,
      orden: paneles.length,
    });
    setPaneles((prev) => [...prev, nuevo]);
  };

  const agregarInversor = async () => {
    const nuevo = await api.post<Inversor>('/api/config/inversores', {
      clave: `inversor_${Date.now()}`,
      nombre: 'Nuevo inversor',
      wattsMax: 5000,
      precioUnitario: 13500,
      activo: true,
      orden: inversores.length,
    });
    setInversores((prev) => [...prev, nuevo]);
  };

  const agregarEstructura = async () => {
    const nuevo = await api.post<Estructura>('/api/config/estructuras', {
      nombre: 'Nueva estructura',
      precio: 0,
      activo: true,
      orden: estructuras.length,
    });
    setEstructuras((prev) => [...prev, nuevo]);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 flex justify-center">
        <p className="text-sm text-white">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <h2 className="text-2xl font-bold text-[#00388d]">Catálogo de equipo</h2>
        {mensaje && <p className="text-xs text-teal-600">{mensaje}</p>}

        <Card title="Paneles solares">
          <div className="space-y-3">
            {paneles.map((panel) => (
              <div key={panel.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center border-b border-gray-50 pb-3">
                <input
                  value={panel.nombre}
                  onChange={(e) => setPaneles((prev) => prev.map((p) => (p.id === panel.id ? { ...p, nombre: e.target.value } : p)))}
                  className="md:col-span-2 border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={panel.watts}
                  onChange={(e) => setPaneles((prev) => prev.map((p) => (p.id === panel.id ? { ...p, watts: Number(e.target.value) } : p)))}
                  placeholder="Watts"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  step="0.01"
                  value={panel.factorBifacial}
                  onChange={(e) => setPaneles((prev) => prev.map((p) => (p.id === panel.id ? { ...p, factorBifacial: Number(e.target.value) } : p)))}
                  placeholder="Factor bifacial"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={panel.precioUnitario}
                  onChange={(e) => setPaneles((prev) => prev.map((p) => (p.id === panel.id ? { ...p, precioUnitario: Number(e.target.value) } : p)))}
                  placeholder="Precio"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <div className="flex gap-2 md:col-span-5 justify-end">
                  <button type="button" onClick={() => guardarPanel(panel)} className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer">Guardar</button>
                  <button type="button" onClick={() => eliminarPanel(panel.id)} className="text-xs border border-red-300 text-red-500 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer">Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarPanel} className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer">+ Agregar panel</button>
          </div>
        </Card>

        <Card title="Inversores">
          <div className="space-y-3">
            {inversores.map((inversor) => (
              <div key={inversor.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center border-b border-gray-50 pb-3">
                <input
                  value={inversor.nombre}
                  onChange={(e) => setInversores((prev) => prev.map((p) => (p.id === inversor.id ? { ...p, nombre: e.target.value } : p)))}
                  className="md:col-span-2 border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={inversor.wattsMax}
                  onChange={(e) => setInversores((prev) => prev.map((p) => (p.id === inversor.id ? { ...p, wattsMax: Number(e.target.value) } : p)))}
                  placeholder="Watts máx"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={inversor.precioUnitario}
                  onChange={(e) => setInversores((prev) => prev.map((p) => (p.id === inversor.id ? { ...p, precioUnitario: Number(e.target.value) } : p)))}
                  placeholder="Precio"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <div className="flex gap-2 md:col-span-4 justify-end">
                  <button type="button" onClick={() => guardarInversor(inversor)} className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer">Guardar</button>
                  <button type="button" onClick={() => eliminarInversor(inversor.id)} className="text-xs border border-red-300 text-red-500 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer">Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarInversor} className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer">+ Agregar inversor</button>
          </div>
        </Card>

        <Card title="Estructuras de instalación">
          <div className="space-y-3">
            {estructuras.map((estructura) => (
              <div key={estructura.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center border-b border-gray-50 pb-3">
                <input
                  value={estructura.nombre}
                  onChange={(e) => setEstructuras((prev) => prev.map((p) => (p.id === estructura.id ? { ...p, nombre: e.target.value } : p)))}
                  className="md:col-span-2 border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={estructura.precio}
                  onChange={(e) => setEstructuras((prev) => prev.map((p) => (p.id === estructura.id ? { ...p, precio: Number(e.target.value) } : p)))}
                  placeholder="Precio"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <div className="flex gap-2 md:col-span-1 justify-end">
                  <button type="button" onClick={() => guardarEstructura(estructura)} className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer">Guardar</button>
                  <button type="button" onClick={() => eliminarEstructura(estructura.id)} className="text-xs border border-red-300 text-red-500 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer">Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarEstructura} className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer">+ Agregar estructura</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
