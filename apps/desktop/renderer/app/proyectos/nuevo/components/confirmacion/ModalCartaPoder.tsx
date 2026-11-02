'use client';

import { useEffect, useRef, useState } from 'react';
import {
  camposFaltantesCartaPoder,
  ETIQUETAS_CARTA_PODER,
  type CampoCartaPoder,
  type DatosCartaPoder,
} from '@cotizador/shared';

/** Los cuatro datos que el asesor puede completar; apoderado y otorgante vienen de la sesión y del cliente. */
type CampoEditable = 'direccionCompleta' | 'codigoPostal' | 'numeroServicio' | 'numeroMedidor';
const CAMPOS_EDITABLES: CampoEditable[] = [
  'direccionCompleta',
  'codigoPostal',
  'numeroServicio',
  'numeroMedidor',
];

interface ModalCartaPoderProps {
  datosIniciales: DatosCartaPoder;
  generando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: (datos: DatosCartaPoder) => void;
}

export default function ModalCartaPoder({
  datosIniciales,
  generando,
  error,
  onCancelar,
  onConfirmar,
}: ModalCartaPoderProps) {
  const [datos, setDatos] = useState(datosIniciales);
  const primerCampo = useRef<HTMLInputElement>(null);

  // El foco inicial se pide una sola vez: si dependiera de `onCancelar` (que cambia
  // en cada render del padre) le robaría el foco al campo que se está escribiendo.
  const cancelarRef = useRef(onCancelar);
  cancelarRef.current = onCancelar;
  useEffect(() => {
    primerCampo.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelarRef.current();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  const faltantes = camposFaltantesCartaPoder(datos);
  const faltaIdentidad = faltantes.some((c) => c === 'nombreApoderado' || c === 'nombreCliente');
  const completo = faltantes.length === 0;
  const hayFaltantesIniciales = camposFaltantesCartaPoder(datosIniciales).length > 0;

  const cambiar = (campo: CampoEditable, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));

  const claseInput = (campo: CampoCartaPoder) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00388d]/30 ${
      faltantes.includes(campo) ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancelar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carta-poder"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (completo && !generando) onConfirmar(datos);
        }}
      >
        <div>
          <h3 id="titulo-carta-poder" className="text-base font-bold text-[#00388d]">
            Datos de la Carta Poder
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {hayFaltantesIniciales
              ? 'Faltan datos para la carta (en amarillo). Complétalos para generarla.'
              : 'Revisa que los datos sean correctos antes de generar la carta.'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {ETIQUETAS_CARTA_PODER.nombreApoderado}
            </label>
            <input
              type="text"
              value={datos.nombreApoderado}
              readOnly
              className={`${claseInput('nombreApoderado')} bg-gray-50 text-gray-600`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {ETIQUETAS_CARTA_PODER.nombreCliente}
            </label>
            <input
              type="text"
              value={datos.nombreCliente}
              readOnly
              className={`${claseInput('nombreCliente')} bg-gray-50 text-gray-600`}
            />
          </div>
          {faltaIdentidad && (
            <p className="text-[11px] text-red-500">
              Falta el nombre del apoderado o del cliente: se toman de tu sesión y del contacto del
              proyecto (Paso 1).
            </p>
          )}

          {CAMPOS_EDITABLES.map((campo, i) => (
            <div key={campo}>
              <label htmlFor={`cp-${campo}`} className="block text-xs font-semibold text-gray-600 mb-1">
                {ETIQUETAS_CARTA_PODER[campo]}
              </label>
              <input
                id={`cp-${campo}`}
                ref={i === 0 ? primerCampo : undefined}
                type="text"
                value={datos[campo]}
                onChange={(e) => cambiar(campo, e.target.value)}
                className={claseInput(campo)}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!completo || generando}
            className="bg-[#8cc63f] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generando ? 'Generando…' : 'Confirmar y Generar PDF'}
          </button>
        </div>
      </form>
    </div>
  );
}
