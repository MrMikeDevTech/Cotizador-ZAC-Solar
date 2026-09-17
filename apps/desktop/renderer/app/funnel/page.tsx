'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TipoColumna, TarjetaFunnel } from './types';
import { COLUMNAS, MAPA_ESTATUS, tarjetasIniciales } from './constants';
import { FunnelHeader, TableroFunnel } from './components';

export default function FunnelPage() {
  const [tarjetas, setTarjetas] = useState<TarjetaFunnel[]>(tarjetasIniciales);
  const [cargando, setCargando] = useState(false);
  const [tarjetaArrastradaId, setTarjetaArrastradaId] = useState<string | null>(null);
  const [columnaSobreVolada, setColumnaSobreVolada] = useState<TipoColumna | null>(null);

  const cargarDatos = () => {
    setCargando(true);
    api
      .get<TarjetaFunnel[]>('/api/funnel')
      .then((data) => {
        if (data && data.length > 0) setTarjetas(data);
      })
      .catch(() => {
        // Se mantienen los datos en memoria si la API aún no está disponible
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Lógica de Drag and Drop Nativa
  const handleDragStart = (id: string) => {
    setTarjetaArrastradaId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnaClave: TipoColumna) => {
    e.preventDefault(); // Necesario para permitir soltar (drop)
    if (columnaSobreVolada !== columnaClave) {
      setColumnaSobreVolada(columnaClave);
    }
  };

  const handleDragLeave = () => {
    setColumnaSobreVolada(null);
  };

  const handleDrop = (columnaDestino: TipoColumna) => {
    setColumnaSobreVolada(null);
    if (!tarjetaArrastradaId) return;

    const nuevoEstatus = MAPA_ESTATUS[columnaDestino];

    // Actualización de estado local
    setTarjetas((prev) =>
      prev.map((item) => {
        if (item.id === tarjetaArrastradaId) {
          return {
            ...item,
            columna: columnaDestino,
            estatus: nuevoEstatus,
          };
        }
        return item;
      })
    );

    // Notificar al backend (opcional)
    api
      .put(`/api/funnel/${tarjetaArrastradaId}`, {
        columna: columnaDestino,
        estatus: nuevoEstatus,
      })
      .catch(() => {
        // Si falla la API, no rompe la UI
      });

    setTarjetaArrastradaId(null);
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        <FunnelHeader
          cargando={cargando}
          onActualizar={cargarDatos}
        />

        <TableroFunnel
          columnas={COLUMNAS}
          tarjetas={tarjetas}
          tarjetaArrastradaId={tarjetaArrastradaId}
          columnaSobreVolada={columnaSobreVolada}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      </div>
    </div>
  );
}