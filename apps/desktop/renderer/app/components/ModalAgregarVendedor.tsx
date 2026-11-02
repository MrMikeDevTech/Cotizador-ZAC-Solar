'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';

interface Props {
  onCancelar: () => void;
  /** Crea el vendedor y entra como él; si falla debe lanzar el error. */
  onCrear: (nombre: string, email: string) => Promise<void>;
}

/** Alta rápida de vendedor: solo nombre y correo, sin contraseña. */
export function ModalAgregarVendedor({ onCancelar, onCrear }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primerCampo = useRef<HTMLInputElement>(null);

  // Foco inicial una sola vez; Escape cierra (con ref para no re-ejecutar el efecto).
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

  const valido = nombre.trim() !== '' && /\S+@\S+\.\S+/.test(email.trim());

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await onCrear(nombre.trim(), email.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el vendedor.');
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancelar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-agregar-vendedor"
        className="w-full max-w-sm bg-white text-gray-800 rounded-2xl shadow-xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
      >
        <div>
          <h3 id="titulo-agregar-vendedor" className="text-base font-bold text-[#00388d]">
            Agregar vendedor
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Se crea la cuenta y entras con ella al instante. No lleva contraseña.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="vendedor-nombre" className="block text-xs font-semibold text-gray-600 mb-1">
              Nombre
            </label>
            <input
              id="vendedor-nombre"
              ref={primerCampo}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
            />
          </div>
          <div>
            <label htmlFor="vendedor-email" className="block text-xs font-semibold text-gray-600 mb-1">
              Correo
            </label>
            <input
              id="vendedor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valido || guardando}
            className="bg-[#8cc63f] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? 'Creando…' : 'Crear y entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
