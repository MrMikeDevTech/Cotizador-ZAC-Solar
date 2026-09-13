'use client';

import { useEffect, useState } from 'react';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { api } from '../../../lib/api';

interface Empresa {
  nombre: string;
  telefono: string;
  localidad: string;
  email: string;
  descripcion: string;
  rfc?: string;
}

const VACIO: Empresa = { nombre: '', telefono: '', localidad: '', email: '', descripcion: '', rfc: '' };

export default function ConfigEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ empresa: Empresa | null }>('/api/config')
      .then((datos) => setEmpresa(datos.empresa ?? VACIO))
      .catch(() => setMensaje('No se pudo conectar con el backend local.'))
      .finally(() => setCargando(false));
  }, []);

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const actualizada = await api.put<Empresa>('/api/config/empresa', empresa);
      setEmpresa(actualizada);
      setMensaje('Datos guardados.');
    } catch {
      setMensaje('No se pudo guardar. Verifica que el backend esté corriendo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        <h2 className="text-2xl font-bold text-[#00388d] mb-8">Datos de la empresa</h2>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={empresa.nombre}
                  onChange={(e) => setEmpresa({ ...empresa, nombre: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={empresa.telefono}
                  onChange={(e) => setEmpresa({ ...empresa, telefono: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Localidad</label>
                <input
                  type="text"
                  value={empresa.localidad}
                  onChange={(e) => setEmpresa({ ...empresa, localidad: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={empresa.email}
                  onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">RFC</label>
                <input
                  type="text"
                  value={empresa.rfc ?? ''}
                  onChange={(e) => setEmpresa({ ...empresa, rfc: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={empresa.descripcion}
                  onChange={(e) => setEmpresa({ ...empresa, descripcion: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-8 mt-6 border-t border-gray-100">
              {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
