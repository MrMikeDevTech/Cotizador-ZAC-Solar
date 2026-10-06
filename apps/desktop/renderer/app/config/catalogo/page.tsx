'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Zap, Layers } from 'lucide-react';
import { api } from '../../../lib/api';
import { Icono } from '../../components/Icono';

interface CatalogoCounts {
  paneles: number;
  inversores: number;
  estructuras: number;
}

const SECCIONES = [
  {
    id: 'paneles',
    nombre: 'Paneles Solares',
    href: '/config/catalogo/paneles',
    icon: Zap,
    descripcion: 'Gestiona el catálogo de paneles solares disponibles',
  },
  {
    id: 'inversores',
    nombre: 'Inversores',
    href: '/config/catalogo/inversores',
    icon: Zap,
    descripcion: 'Gestiona el catálogo de inversores disponibles',
  },
  {
    id: 'estructuras',
    nombre: 'Estructuras de Instalación',
    href: '/config/catalogo/estructuras',
    icon: Layers,
    descripcion: 'Gestiona las estructuras de instalación disponibles',
  },
];

export default function ConfigCatalogoIndice() {
  const [cuentas, setCuentas] = useState<CatalogoCounts>({ paneles: 0, inversores: 0, estructuras: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ paneles: Array<{ id: string }>; inversores: Array<{ id: string }>; estructuras: Array<{ id: string }> }>(
        '/api/config'
      )
      .then((datos) => {
        setCuentas({
          paneles: datos.paneles?.length ?? 0,
          inversores: datos.inversores?.length ?? 0,
          estructuras: datos.estructuras?.length ?? 0,
        });
      })
      .catch(() => setError('No se pudo conectar con el backend local.'))
      .finally(() => setCargando(false));
  }, []);

  const obtenerCuenta = (id: 'paneles' | 'inversores' | 'estructuras'): number => {
    return cuentas[id];
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        <h2 className="text-2xl font-bold text-[#00388d] mb-2">Catálogo de equipo</h2>
        <p className="text-xs text-gray-500 mb-8">Gestiona paneles, inversores y estructuras de instalación</p>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SECCIONES.map((seccion) => (
              <Link key={seccion.id} href={seccion.href}>
                <div className="h-full p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-gray-200 hover:border-[#00388d] hover:shadow-lg transition-all cursor-pointer flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-full bg-white border border-gray-200">
                      <Icono icon={seccion.icon} size={24} className="text-[#00388d]" />
                    </div>
                    <span className="text-2xl font-bold text-[#f7931e]">{obtenerCuenta(seccion.id as any)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#00388d] mb-2">{seccion.nombre}</h3>
                  <p className="text-xs text-gray-500 flex-1">{seccion.descripcion}</p>
                  <div className="mt-4 text-xs text-[#00388d] font-semibold hover:underline">Ver detalles →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
