'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { DataTable, ColumnaTabla } from '../../components/DataTable';
import { Icono } from '../../components/Icono';
import { Proyecto } from '../types';
import { nombreCompletoContacto, formatearFecha } from '../utils';
import { EtiquetaFase } from './EtiquetaFase';

interface ProyectosTablaProps {
  proyectos: Proyecto[];
  onEliminar: (proyecto: Proyecto) => void;
}

export function ProyectosTabla({ proyectos, onEliminar }: ProyectosTablaProps) {
  const columnas: ColumnaTabla<Proyecto>[] = [
    {
      clave: 'codigo',
      encabezado: 'Código',
      anchoMin: '110px',
      render: (p) => <span className="font-semibold text-[#00388d]">{p.codigo}</span>,
    },
    {
      clave: 'contacto',
      encabezado: 'Contacto',
      anchoMin: '160px',
      render: (p) => <span className="font-medium text-gray-800">{nombreCompletoContacto(p.contacto)}</span>,
    },
    { clave: 'nombre', encabezado: 'Proyecto', anchoMin: '160px' },
    { clave: 'tarifa', encabezado: 'Tarifa', anchoMin: '70px' },
    {
      clave: 'localidadConsumo',
      encabezado: 'Localidad',
      anchoMin: '140px',
      render: (p) => p.localidadConsumo || '-',
    },
    {
      clave: 'fase',
      encabezado: 'Fase',
      anchoMin: '130px',
      render: (p) => <EtiquetaFase fase={p.fase} />,
    },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      anchoMin: '100px',
      render: (p) => <span className="text-gray-400">{formatearFecha(p.updatedAt)}</span>,
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      anchoMin: '110px',
      render: (p) => (
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Link
            href={`/proyectos/nuevo?id=${p.id}`}
            title="Ver detalles"
            className="p-1.5 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
          >
            <Icono icon={Eye} size={16} />
          </Link>
          <Link
            href={`/proyectos/nuevo?id=${p.id}`}
            title="Editar proyecto"
            className="p-1.5 hover:bg-amber-100 hover:text-amber-600 rounded-lg transition-colors"
          >
            <Icono icon={Pencil} size={16} />
          </Link>
          <button
            onClick={() => onEliminar(p)}
            title="Eliminar proyecto"
            className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
          >
            <Icono icon={Trash2} size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columnas={columnas}
      filas={proyectos}
      claveFila={(p) => p.id}
      vacio="No se encontraron proyectos registrados."
    />
  );
}
