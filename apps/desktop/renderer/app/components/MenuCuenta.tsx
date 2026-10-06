'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { Icono } from './Icono';
import { useSesion } from '../../lib/SesionContext';

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
};

function etiquetaRol(rol: string): string {
  return ETIQUETAS_ROL[rol] ?? rol;
}

/**
 * Reemplaza a `UserSelector`: ya no permite "ser" cualquier usuario del
 * sistema con un clic, muestra el usuario con sesión iniciada y da acceso a
 * "Mi cuenta" y "Cerrar sesión". Mismo patrón de apertura/cierre que los
 * desplegables de `NavPrincipal` (clic, Escape, clic fuera).
 */
export function MenuCuenta() {
  const { usuario, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const manejarClicFuera = (evento: MouseEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', manejarClicFuera);
    document.addEventListener('keydown', manejarTeclado);
    return () => {
      document.removeEventListener('mousedown', manejarClicFuera);
      document.removeEventListener('keydown', manejarTeclado);
    };
  }, [abierto]);

  const manejarBlur = (evento: FocusEvent<HTMLDivElement>) => {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
      setAbierto(false);
    }
  };

  if (!usuario) return null;

  const manejarCerrarSesion = async () => {
    if (cerrando) return;
    setCerrando(true);
    setAbierto(false);
    try {
      await cerrarSesion();
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div
      ref={contenedorRef}
      onBlur={manejarBlur}
      className="relative pl-6 border-l border-blue-400/50 flex items-center"
    >
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="flex items-center gap-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded cursor-pointer"
      >
        <span className="w-8 h-8 bg-orange-200 text-[#00388d] rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
          {usuario.nombre.charAt(0).toUpperCase()}
        </span>
        <span className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold">{usuario.nombre}</span>
          <span className="text-[10px] text-blue-200">{etiquetaRol(usuario.rol)}</span>
        </span>
        <Icono
          icon={ChevronDown}
          size={14}
          className={`transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full pt-1 w-48 z-50 animate-fade-in">
          <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-[#00388d] truncate">{usuario.nombre}</p>
              <p className="text-[11px] text-gray-400 truncate">{usuario.email}</p>
            </div>
            <Link
              href="/cuenta"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors"
            >
              <Icono icon={User} size={14} />
              Mi cuenta
            </Link>
            <button
              type="button"
              onClick={manejarCerrarSesion}
              disabled={cerrando}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 hover:text-red-600 text-xs transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              <Icono icon={LogOut} size={14} />
              {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
