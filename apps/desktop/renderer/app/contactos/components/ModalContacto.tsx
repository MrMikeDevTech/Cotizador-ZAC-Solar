'use client';

import { Loader2, Save } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Icono } from '../../components/Icono';
import { estadosMexico, localidadesPorEstado, fuentesContacto, estatusContacto } from '../../proyectos/nuevo/constants';
import { ContactoFormData } from '../types';

interface ModalContactoProps {
  abierto: boolean;
  esEdicion: boolean;
  usuarioActivo: string;
  form: ContactoFormData;
  guardando: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

export function ModalContacto({
  abierto,
  esEdicion,
  usuarioActivo,
  form,
  guardando,
  onChange,
  onSubmit,
  onCerrar,
}: ModalContactoProps) {
  const localidadesSugeridas = form.estado ? localidadesPorEstado[form.estado] || [] : [];

  return (
    <Modal abierto={abierto} onCerrar={guardando ? () => {} : onCerrar} tamano="lg" titulo={undefined}>
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-700">
          {esEdicion ? 'Editar información del contacto' : 'Información de nuevo contacto'}
        </h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          Registrando como: <strong className="text-[#00388d]">{usuarioActivo}</strong>
        </span>
      </div>

      <form id="form-contacto" onSubmit={onSubmit} className="space-y-6">
        {/* FILA 1: NOMBRE Y APELLIDOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre*</label>
            <input
              type="text"
              required
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Apellido paterno</label>
            <input
              type="text"
              name="apellidoPaterno"
              value={form.apellidoPaterno}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Apellido materno</label>
            <input
              type="text"
              name="apellidoMaterno"
              value={form.apellidoMaterno}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
        </div>

        {/* FILA 2: ESTADO, LOCALIDAD, TELÉFONO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estado*</label>
            <select
              required
              name="estado"
              value={form.estado}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-700 bg-transparent cursor-pointer"
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
              required
              name="localidad"
              list="lista-localidades-modal"
              placeholder="Selecciona o escribe..."
              value={form.localidad}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800 bg-transparent"
            />
            <datalist id="lista-localidades-modal">
              {localidadesSugeridas.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Teléfono*(Incluir lada)</label>
            <input
              type="tel"
              required
              name="telefono"
              value={form.telefono}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
        </div>

        {/* FILA 3: CELULAR, CORREO, FUENTE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Celular</label>
            <input
              type="tel"
              name="celular"
              value={form.celular}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fuente del contacto*</label>
            <select
              required
              name="fuenteContacto"
              value={form.fuenteContacto}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-700 bg-transparent cursor-pointer"
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

        {/* FILA 4: ESTATUS Y NOTAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estatus*</label>
            <select
              required
              name="estatus"
              value={form.estatus}
              onChange={onChange}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-700 bg-transparent cursor-pointer"
            >
              <option value="">----------</option>
              {estatusContacto.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={onChange}
              rows={1}
              className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1 text-sm text-gray-800 resize-none"
            />
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex justify-end items-center gap-6 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-[#00388d] hover:bg-blue-900 text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icono icon={guardando ? Loader2 : Save} size={15} className={guardando ? 'animate-spin' : ''} />
            {esEdicion ? (guardando ? 'Actualizando...' : 'Actualizar') : guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
