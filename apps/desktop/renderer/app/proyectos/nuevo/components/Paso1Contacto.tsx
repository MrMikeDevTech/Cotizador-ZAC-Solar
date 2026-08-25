'use client';

import { useState } from 'react';
import Link from 'next/link';
import { estadosMexico, localidadesPorEstado, fuentesContacto, estatusContacto } from '../constants';
import { DatosContacto } from '../types';

interface Paso1ContactoProps {
  datosContacto?: DatosContacto;
  onActualizarDatos?: (datos: Partial<DatosContacto>) => void;
  onSiguiente: () => void;
}

export default function Paso1Contacto({
  datosContacto,
  onActualizarDatos,
  onSiguiente,
}: Paso1ContactoProps) {
  const [mostrarEmpresariales, setMostrarEmpresariales] = useState(
    datosContacto?.mostrarEmpresariales ?? false
  );
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(
    datosContacto?.estado ?? ''
  );

  const localidadesSugeridas = localidadesPorEstado[estadoSeleccionado] || [];

  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoEstado = e.target.value;
    setEstadoSeleccionado(nuevoEstado);
    onActualizarDatos?.({ estado: nuevoEstado });
  };

  const handleToggleEmpresariales = () => {
    const nuevoValor = !mostrarEmpresariales;
    setMostrarEmpresariales(nuevoValor);
    onActualizarDatos?.({ mostrarEmpresariales: nuevoValor });
  };

  return (
    <form className="space-y-8 animate-fade-in" onSubmit={(e) => e.preventDefault()}>
      <div className="w-full md:w-1/3">
        <label className="block text-xs text-gray-400 mb-1">Contacto</label>
        <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
          <option value="">Seleccionar contacto existente</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nombre*</label>
          <input
            type="text"
            defaultValue={datosContacto?.nombre ?? ''}
            onChange={(e) => onActualizarDatos?.({ nombre: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Apellido paterno</label>
          <input
            type="text"
            defaultValue={datosContacto?.apellidoPaterno ?? ''}
            onChange={(e) => onActualizarDatos?.({ apellidoPaterno: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Apellido materno</label>
          <input
            type="text"
            defaultValue={datosContacto?.apellidoMaterno ?? ''}
            onChange={(e) => onActualizarDatos?.({ apellidoMaterno: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Teléfono* (Incluir lada)</label>
          <input
            type="tel"
            defaultValue={datosContacto?.telefono ?? ''}
            onChange={(e) => onActualizarDatos?.({ telefono: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Celular</label>
          <input
            type="tel"
            defaultValue={datosContacto?.celular ?? ''}
            onChange={(e) => onActualizarDatos?.({ celular: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
          <input
            type="email"
            defaultValue={datosContacto?.email ?? ''}
            onChange={(e) => onActualizarDatos?.({ email: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Estado*</label>
          <select
            value={estadoSeleccionado}
            onChange={handleEstadoChange}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="">----------</option>
            {estadosMexico.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Localidad*</label>
          <input
            type="text"
            list="lista-localidades"
            placeholder="Selecciona o escribe..."
            defaultValue={datosContacto?.localidad ?? ''}
            onChange={(e) => onActualizarDatos?.({ localidad: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d]"
          />
          <datalist id="lista-localidades">
            {localidadesSugeridas.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Fuente del contacto*</label>
          <select
            defaultValue={datosContacto?.fuenteContacto ?? ''}
            onChange={(e) => onActualizarDatos?.({ fuenteContacto: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="">----------</option>
            {fuentesContacto.map((fuente) => (
              <option key={fuente} value={fuente}>
                {fuente}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Estatus*</label>
          <select
            defaultValue={datosContacto?.estatus ?? ''}
            onChange={(e) => onActualizarDatos?.({ estatus: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="">----------</option>
            {estatusContacto.map((estatus) => (
              <option key={estatus} value={estatus}>
                {estatus}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Notas</label>
          <textarea
            rows={1}
            defaultValue={datosContacto?.notas ?? ''}
            onChange={(e) => onActualizarDatos?.({ notas: e.target.value })}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"
          />
        </div>
      </div>

      <div className="pt-4">
        <label className="flex items-center gap-2 cursor-pointer w-max">
          <input
            type="checkbox"
            checked={mostrarEmpresariales}
            onChange={handleToggleEmpresariales}
            className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
          />
          <span className="text-sm font-medium text-gray-600">Registrar datos empresariales</span>
        </label>

        {mostrarEmpresariales && (
          <div className="mt-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-4">Datos empresariales:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">RFC</label>
                <input
                  type="text"
                  defaultValue={datosContacto?.empresariales?.rfc ?? ''}
                  onChange={(e) =>
                    onActualizarDatos?.({
                      empresariales: {
                        ...(datosContacto?.empresariales || { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' }),
                        rfc: e.target.value,
                      },
                    })
                  }
                  className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cargo del contacto</label>
                <input
                  type="text"
                  defaultValue={datosContacto?.empresariales?.cargo ?? ''}
                  onChange={(e) =>
                    onActualizarDatos?.({
                      empresariales: {
                        ...(datosContacto?.empresariales || { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' }),
                        cargo: e.target.value,
                      },
                    })
                  }
                  className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Razón social</label>
                <input
                  type="text"
                  defaultValue={datosContacto?.empresariales?.razonSocial ?? ''}
                  onChange={(e) =>
                    onActualizarDatos?.({
                      empresariales: {
                        ...(datosContacto?.empresariales || { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' }),
                        razonSocial: e.target.value,
                      },
                    })
                  }
                  className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Actividad comercial</label>
                <input
                  type="text"
                  defaultValue={datosContacto?.empresariales?.actividadComercial ?? ''}
                  onChange={(e) =>
                    onActualizarDatos?.({
                      empresariales: {
                        ...(datosContacto?.empresariales || { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' }),
                        actividadComercial: e.target.value,
                      },
                    })
                  }
                  className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
        <Link
          href="/"
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Guardar y continuar
        </button>
      </div>
    </form>
  );
}
