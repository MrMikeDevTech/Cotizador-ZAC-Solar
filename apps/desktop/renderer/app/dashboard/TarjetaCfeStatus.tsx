'use client';

import { Gauge } from 'lucide-react';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { formatoFechaHora } from './utilidades';
import type { EstadoCfeRates, EstadoRecurso } from './tipos';

interface TarjetaCfeStatusProps {
  estado: EstadoRecurso<EstadoCfeRates>;
  className?: string;
}

/** Estado de la sincronización de tarifas CFE (`/api/cfe-rates/status`). */
export function TarjetaCfeStatus({ estado, className = '' }: TarjetaCfeStatusProps) {
  return (
    <TarjetaBento
      titulo="Tarifas CFE"
      icono={Gauge}
      enlace={{ href: '/config/utilidad', etiqueta: 'Configurar' }}
      className={className}
    >
      <EnvolturaEstado
        estado={estado}
        vacio={(datos) => datos.totalRows === 0}
        mensajeVacio="Aún no se ha sincronizado ninguna tarifa de CFE."
        alturaEsqueleto="h-24"
        render={(datos) => {
          const periodosUnicos = new Set(datos.periods.map((p) => `${p.year}-${p.month}`)).size;
          return (
            <div className="space-y-2.5 text-sm mt-1">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Última sincronización</span>
                <span className="font-semibold text-gray-800 text-right">
                  {datos.lastFetchedAt ? formatoFechaHora(datos.lastFetchedAt) : 'Nunca'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Escalones cargados</span>
                <span className="font-semibold text-gray-800">{datos.totalRows.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Periodos con datos</span>
                <span className="font-semibold text-gray-800">{periodosUnicos.toLocaleString('es-MX')}</span>
              </div>
            </div>
          );
        }}
      />
    </TarjetaBento>
  );
}
