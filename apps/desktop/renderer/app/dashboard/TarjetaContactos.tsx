'use client';

import { Users } from 'lucide-react';
import { TarjetaBento } from './TarjetaBento';
import { EnvolturaEstado } from './EnvolturaEstado';
import { formatoFechaCorta } from './utilidades';
import type { ContactoReciente, EstadoRecurso } from './tipos';

interface TarjetaContactosProps {
  estado: EstadoRecurso<ContactoReciente[]>;
  className?: string;
}

const MAX_VISIBLES = 5;

/**
 * `/api/contactos` ordena por nombre, no por fecha: aquí se reordena por
 * `createdAt` en el cliente para mostrar los contactos más recientes, sin
 * tocar el endpoint compartido con el módulo de contactos.
 */
export function TarjetaContactos({ estado, className = '' }: TarjetaContactosProps) {
  return (
    <TarjetaBento
      titulo="Contactos recientes"
      icono={Users}
      enlace={{ href: '/contactos', etiqueta: 'Ver todos' }}
      className={className}
    >
      <EnvolturaEstado
        estado={estado}
        vacio={(contactos) => contactos.length === 0}
        mensajeVacio="Todavía no hay contactos registrados."
        alturaEsqueleto="h-48"
        render={(contactos) => {
          const recientes = [...contactos]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, MAX_VISIBLES);
          return (
            <ul className="space-y-3 overflow-y-auto max-h-64 pr-1">
              {recientes.map((contacto) => {
                const nombreCompleto = [contacto.nombre, contacto.apellidoPaterno]
                  .filter(Boolean)
                  .join(' ');
                const ubicacion = [contacto.localidad, contacto.estado].filter(Boolean).join(', ');
                return (
                  <li
                    key={contacto.id}
                    className="flex justify-between items-start gap-2 text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{nombreCompleto || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-400">{ubicacion || 'Sin ubicación'}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatoFechaCorta(contacto.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }}
      />
    </TarjetaBento>
  );
}
