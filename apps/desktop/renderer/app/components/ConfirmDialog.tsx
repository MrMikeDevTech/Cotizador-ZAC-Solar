'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Icono } from './Icono';

interface ConfirmDialogProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void | Promise<void>;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
}

/**
 * Diálogo de confirmación sobre `Modal`. Sustituye al `confirm()` nativo del
 * navegador (p. ej. el usado al eliminar un contacto), que no se puede
 * estilizar, no soporta estados de carga y bloquea el hilo principal.
 */
export function ConfirmDialog({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
}: ConfirmDialogProps) {
  const [cargando, setCargando] = useState(false);

  const manejarConfirmar = async () => {
    setCargando(true);
    try {
      await onConfirmar();
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo={titulo}
      tamano="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={manejarConfirmar}
            disabled={cargando}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 ${
              peligroso ? 'bg-[#ef4444] hover:bg-red-600' : 'bg-[#00388d] hover:bg-blue-900'
            }`}
          >
            {cargando ? 'Procesando...' : textoConfirmar}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {peligroso && (
          <span className="shrink-0 mt-0.5 text-[#ef4444]">
            <Icono icon={TriangleAlert} size={20} />
          </span>
        )}
        <p className="text-xs text-gray-600 leading-relaxed">{mensaje}</p>
      </div>
    </Modal>
  );
}
