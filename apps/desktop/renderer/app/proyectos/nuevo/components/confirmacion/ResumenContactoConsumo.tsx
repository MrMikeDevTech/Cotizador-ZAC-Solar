'use client';

import React from 'react';
import Card from './Card';
import { DatosContacto } from '../../types';
import { generarCodigoAbreviado, formatearMoneda } from './calculosConfirmacion';

interface ResumenContactoConsumoProps {
  datosContacto?: DatosContacto;
  nombreProyecto?: string;
  nombreRecibo?: string;
  tarifaSeleccionada?: string;
  numeroServicio?: string;
  consumoPromedioKwh?: number;
  pagoPromedioCFE?: number;
  periodo?: string;
}

export default function ResumenContactoConsumo({
  datosContacto,
  nombreProyecto = '',
  nombreRecibo = '',
  tarifaSeleccionada = '1A',
  numeroServicio = '',
  consumoPromedioKwh = 0,
  pagoPromedioCFE = 0,
  periodo = 'Bimestral',
}: ResumenContactoConsumoProps) {
  const nombreCompleto = [
    datosContacto?.nombre,
    datosContacto?.apellidoPaterno,
    datosContacto?.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(' ') || 'Sin nombre registrado';

  const codigoContacto = generarCodigoAbreviado(nombreCompleto, '006');
  const codigoProyecto = generarCodigoAbreviado(nombreProyecto || nombreCompleto, '009-18');
  const localidad = datosContacto?.localidad || datosContacto?.estado || 'No especificada';
  const telefono = datosContacto?.telefono || datosContacto?.celular || 'No registrado';
  const email = datosContacto?.email || 'No registrado';
  const tipoContacto = datosContacto?.fuenteContacto || 'Directo';

  const unidadPeriodo = periodo === 'Bimestral' ? 'bimestre' : 'mes';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. INFORMACIÓN DEL CONTACTO */}
      <Card title="Información del contacto">
        <div className="space-y-2.5 text-xs md:text-sm text-gray-700">
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Código:</strong>
            <span className="font-semibold text-gray-800">{codigoContacto}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Contacto:</strong>
            <span className="font-semibold text-gray-800 uppercase">{nombreCompleto}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Localidad:</strong>
            <span className="font-semibold text-gray-800">{localidad}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Tipo:</strong>
            <span className="font-semibold text-gray-800">{tipoContacto}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Teléfono:</strong>
            <span className="font-semibold text-gray-800">{telefono}</span>
          </p>
          <p className="flex justify-between">
            <strong className="text-gray-500 font-medium">Correo electrónico:</strong>
            <span className="font-semibold text-gray-800">{email}</span>
          </p>
        </div>
      </Card>

      {/* 2. INFORMACIÓN DEL CONSUMO */}
      <Card title="Información del consumo">
        <div className="space-y-2.5 text-xs md:text-sm text-gray-700">
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Código del proyecto:</strong>
            <span className="font-semibold text-gray-800">{codigoProyecto}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Nombre:</strong>
            <span className="font-semibold text-gray-800 uppercase">
              {nombreProyecto || nombreCompleto}
            </span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Nombre del recibo:</strong>
            <span className="font-semibold text-gray-800 uppercase">
              {nombreRecibo || nombreCompleto}
            </span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Tarifa:</strong>
            <span className="font-bold text-[#00388d]">{tarifaSeleccionada}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">Número de servicio:</strong>
            <span className="font-semibold text-gray-800">{numeroServicio || 'No registrado'}</span>
          </p>
          <p className="flex justify-between border-b border-gray-50 pb-1">
            <strong className="text-gray-500 font-medium">kWh/{unidadPeriodo}:</strong>
            <span className="font-bold text-gray-800">
              {consumoPromedioKwh.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </span>
          </p>
          <p className="flex justify-between">
            <strong className="text-gray-500 font-medium">Monto {unidadPeriodo}:</strong>
            <span className="font-bold text-gray-800">
              {formatearMoneda(pagoPromedioCFE)}
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}
