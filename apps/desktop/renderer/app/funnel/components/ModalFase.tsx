'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Icono } from '../../components/Icono';
import { COLOR_FASE_PREDETERMINADO, COLORES_FASE } from '../constants';

interface ModalFaseProps {
  abierto: boolean;
  titulo: string;
  nombreInicial?: string;
  colorInicial?: string;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: { nombre: string; color: string }) => void;
}

const ID_FORMULARIO = 'form-fase-funnel';

/**
 * Formulario de creación/renombrado de fase, montado sobre el `Modal`
 * compartido. El botón de guardar vive en el footer del `Modal` (fuera del
 * `<form>` en el árbol de React) y se asocia por `form={ID_FORMULARIO}`.
 */
export function ModalFase({
  abierto,
  titulo,
  nombreInicial = '',
  colorInicial = COLOR_FASE_PREDETERMINADO,
  guardando,
  onCerrar,
  onGuardar,
}: ModalFaseProps) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [color, setColor] = useState(colorInicial);

  useEffect(() => {
    if (abierto) {
      setNombre(nombreInicial);
      setColor(colorInicial);
    }
  }, [abierto, nombreInicial, colorInicial]);

  const manejarEnvio = (evento: FormEvent) => {
    evento.preventDefault();
    if (!nombre.trim() || guardando) return;
    onGuardar({ nombre: nombre.trim(), color });
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={guardando ? () => {} : onCerrar}
      titulo={titulo}
      tamano="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORMULARIO}
            disabled={guardando}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow bg-[#00388d] hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            <Icono icon={guardando ? Loader2 : Save} size={14} className={guardando ? 'animate-spin' : ''} />
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nombre de la fase</label>
          <input
            type="text"
            required
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#00388d] focus:outline-none py-1.5 text-sm text-gray-800"
            placeholder="Ej. Seguimiento"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORES_FASE.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setColor(opcion)}
                aria-label={`Color ${opcion}`}
                className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                  color === opcion ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: opcion }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Color personalizado"
              className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer bg-transparent p-0"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
