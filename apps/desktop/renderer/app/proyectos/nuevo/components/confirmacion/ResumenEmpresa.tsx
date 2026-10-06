'use client';

import React from 'react';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import Card from './Card';
import { DatosEmpresa } from '../../types';
import { DATOS_EMPRESA_DEFECTO } from '../../constants';

interface ResumenEmpresaProps {
  empresa?: DatosEmpresa;
}

export default function ResumenEmpresa({ empresa = DATOS_EMPRESA_DEFECTO }: ResumenEmpresaProps) {
  return (
    <Card title="Información de empresa">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm text-gray-700">
        <div className="flex flex-col space-y-2">
          <p className="flex items-center gap-2 font-bold text-gray-800">
            <Icono icon={Building2} size={16} className="text-[#00388d]" />
            <span>{empresa.nombre}</span>
          </p>
          <p className="flex items-center gap-2">
            <Icono icon={Phone} size={16} className="text-[#00388d]" />
            <span>{empresa.telefono}</span>
          </p>
          <p className="flex items-center gap-2">
            <Icono icon={MapPin} size={16} className="text-[#00388d]" />
            <span>{empresa.localidad}</span>
          </p>
          <p className="flex items-center gap-2">
            <Icono icon={Mail} size={16} className="text-[#00388d]" />
            <span>{empresa.email}</span>
          </p>
        </div>
        <div className="flex items-center">
          <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
            {empresa.descripcion}
          </p>
        </div>
      </div>
    </Card>
  );
}
