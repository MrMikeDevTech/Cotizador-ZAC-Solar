'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { DataTable, ColumnaTabla } from '../../components/DataTable';
import { Icono } from '../../components/Icono';
import { Contacto, ColumnaOrden, DireccionOrden } from '../types';
import { nombreCompleto, ubicacionContacto, formatearFecha } from '../utils';

interface ContactosTablaProps {
  contactos: Contacto[];
  criterioOrden: ColumnaOrden | null;
  direccionOrden: DireccionOrden;
  onOrdenar: (columna: ColumnaOrden) => void;
  onEditar: (contacto: Contacto) => void;
  onEliminar: (contacto: Contacto) => void;
}

export function ContactosTabla({
  contactos,
  criterioOrden,
  direccionOrden,
  onOrdenar,
  onEditar,
  onEliminar,
}: ContactosTablaProps) {
  const columnas: ColumnaTabla<Contacto>[] = [
    { clave: 'codigo', encabezado: 'Código', ordenable: true, anchoMin: '90px' },
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
      anchoMin: '180px',
      render: (c) => <span className="font-medium text-gray-800">{nombreCompleto(c)}</span>,
    },
    {
      clave: 'ubicacion',
      encabezado: 'Ubicación',
      ordenable: true,
      anchoMin: '160px',
      render: (c) => ubicacionContacto(c),
    },
    { clave: 'estatus', encabezado: 'Estatus', ordenable: true, anchoMin: '140px' },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      ordenable: true,
      anchoMin: '100px',
      render: (c) => <span className="text-gray-400">{formatearFecha(c.createdAt)}</span>,
    },
    {
      clave: 'notas',
      encabezado: 'Notas',
      anchoMin: '200px',
      render: (c) => <span className="line-clamp-2 max-w-xs">{c.notas || '-'}</span>,
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      anchoMin: '90px',
      render: (c) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onEditar(c)}
            title="Editar contacto"
            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
          >
            <Icono icon={Pencil} size={16} />
          </button>
          <button
            onClick={() => onEliminar(c)}
            title="Eliminar contacto"
            className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
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
      filas={contactos}
      claveFila={(c) => c.id}
      orden={criterioOrden ? { clave: criterioOrden, direccion: direccionOrden } : null}
      onOrdenar={(clave) => onOrdenar(clave as ColumnaOrden)}
      vacio="No se encontraron contactos."
    />
  );
}
