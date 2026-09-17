'use client';

import { Contacto, ColumnaOrden, DireccionOrden } from '../types';

interface ContactosTablaProps {
  contactos: Contacto[];
  criterioOrden: ColumnaOrden | null;
  direccionOrden: DireccionOrden;
  onOrdenar: (columna: ColumnaOrden) => void;
  onEditar: (contacto: Contacto) => void;
  onEliminar: (id: string, nombre: string) => void;
}

export function ContactosTabla({
  contactos,
  criterioOrden,
  direccionOrden,
  onOrdenar,
  onEditar,
  onEliminar,
}: ContactosTablaProps) {
  const renderIconoOrden = (columna: ColumnaOrden) => {
    if (criterioOrden !== columna) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return <span className="text-[#00388d] ml-1">{direccionOrden === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="overflow-x-auto pt-2">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 font-bold select-none">
            <th
              onClick={() => onOrdenar('codigo')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Código {renderIconoOrden('codigo')}
            </th>
            <th
              onClick={() => onOrdenar('nombre')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Nombre {renderIconoOrden('nombre')}
            </th>
            <th
              onClick={() => onOrdenar('ubicacion')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Ubicación {renderIconoOrden('ubicacion')}
            </th>
            <th
              onClick={() => onOrdenar('estatus')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Estatus {renderIconoOrden('estatus')}
            </th>
            <th
              onClick={() => onOrdenar('fecha')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Fecha {renderIconoOrden('fecha')}
            </th>
            <th className="py-3 px-3">Notas</th>
            <th
              onClick={() => onOrdenar('autor')}
              className="py-3 px-3 cursor-pointer hover:text-[#00388d] transition-colors"
            >
              Autor {renderIconoOrden('autor')}
            </th>
            <th className="py-3 px-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {contactos.length > 0 ? (
            contactos.map((c, index) => (
              <tr key={c.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                <td className="py-3.5 px-3 font-semibold text-[#00388d] hover:underline cursor-pointer">
                  {c.codigo}
                </td>
                <td className="py-3.5 px-3 font-medium text-gray-800">{c.nombre}</td>
                <td className="py-3.5 px-3 text-gray-600">{c.ubicacion}</td>
                <td className="py-3.5 px-3 text-gray-600">{c.estatus}</td>
                <td className="py-3.5 px-3 text-gray-500">{c.fecha}</td>
                <td className="py-3.5 px-3 text-gray-600 max-w-xs">{c.notas}</td>
                <td className="py-3.5 px-3 font-semibold text-gray-700">{c.autor}</td>
                <td className="py-3.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEditar(c)}
                      title="Editar contacto"
                      className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onEliminar(c.id, c.nombre)}
                      title="Eliminar contacto"
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400">
                No se encontraron registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
