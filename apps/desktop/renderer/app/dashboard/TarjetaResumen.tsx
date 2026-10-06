'use client';

import { TrendingUp, Wallet, FolderKanban, UserPlus } from 'lucide-react';
import { Icono } from '../components/Icono';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { formatoMoneda } from './utilidades';
import type { EstadoRecurso, ResumenReporte } from './tipos';

interface TarjetaResumenProps {
  estado: EstadoRecurso<ResumenReporte>;
  nombreUsuario: string;
  className?: string;
}

/**
 * Tarjeta ancha del bento: saluda al usuario y resume los números clave del
 * negocio, todos derivados de `/api/reportes/resumen` (nunca inventados).
 */
export function TarjetaResumen({ estado, nombreUsuario, className = '' }: TarjetaResumenProps) {
  return (
    <TarjetaBento titulo={`Hola, ${nombreUsuario}`} icono={TrendingUp} tonoFondo="azul" className={className}>
      <EnvolturaEstado
        estado={estado}
        alturaEsqueleto="h-20"
        render={(datos) => {
          const totalProyectos = datos.proyectosPorFase.reduce((acc, fase) => acc + fase.total, 0);
          const indicadores = [
            { etiqueta: 'Monto cotizado', valor: formatoMoneda(datos.montoTotalCotizado), icono: Wallet },
            { etiqueta: 'Monto vendido', valor: formatoMoneda(datos.montoTotalVendido), icono: TrendingUp },
            { etiqueta: 'Proyectos activos', valor: totalProyectos.toLocaleString('es-MX'), icono: FolderKanban },
            { etiqueta: 'Contactos nuevos (mes)', valor: datos.contactosNuevosMes.toLocaleString('es-MX'), icono: UserPlus },
          ];
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1">
              {indicadores.map((item) => (
                <div key={item.etiqueta} className="bg-white/10 rounded-2xl p-4 flex flex-col gap-1">
                  <Icono icon={item.icono} size={18} className="text-[#2dd4bf]" />
                  <span className="text-xl font-bold leading-tight">{item.valor}</span>
                  <span className="text-[11px] text-white/70">{item.etiqueta}</span>
                </div>
              ))}
            </div>
          );
        }}
      />
    </TarjetaBento>
  );
}
