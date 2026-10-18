'use client';

import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import Card from './Card';
import { DatosEmpresa } from '../../types';

interface ResumenEmpresaProps {
  empresa?: DatosEmpresa | null;
}

/**
 * Bloque con los datos de la empresa vendedora.
 *
 * **No se renderiza si no hay empresa capturada.** Antes caía a un ejemplo
 * —nombre, teléfono y correo inventados— que se colaba en la pantalla de
 * confirmación y en el PDF, de modo que una cotización salía a nombre de una
 * empresa que el usuario nunca escribió. Mejor que falte el bloque a que
 * mienta: los datos se capturan en Configuración → Formato de Cotización.
 *
 * Se considera "sin empresa" también cuando el nombre está en blanco, porque
 * la fila puede existir con los campos vacíos tras borrar su contenido.
 */
export default function ResumenEmpresa({ empresa }: ResumenEmpresaProps) {
  if (!empresa || !empresa.nombre.trim()) return null;

  return (
    <Card title="Información de empresa">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm text-gray-700">
        <div className="flex flex-col space-y-2">
          <p className="flex items-center gap-2 font-bold text-gray-800">
            <Icono icon={Building2} size={16} className="text-[#00388d]" />
            <span>{empresa.nombre}</span>
          </p>
          {empresa.telefono && (
            <p className="flex items-center gap-2">
              <Icono icon={Phone} size={16} className="text-[#00388d]" />
              <span>{empresa.telefono}</span>
            </p>
          )}
          {empresa.localidad && (
            <p className="flex items-center gap-2">
              <Icono icon={MapPin} size={16} className="text-[#00388d]" />
              <span>{empresa.localidad}</span>
            </p>
          )}
          {empresa.email && (
            <p className="flex items-center gap-2">
              <Icono icon={Mail} size={16} className="text-[#00388d]" />
              <span>{empresa.email}</span>
            </p>
          )}
        </div>
        {empresa.descripcion && (
          <div className="flex items-center">
            <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{empresa.descripcion}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
