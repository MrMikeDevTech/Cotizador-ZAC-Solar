'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { User, LogOut, ChevronDown, Plus, Check } from 'lucide-react';
import { Icono } from './Icono';
import { useSesion } from '../../lib/SesionContext';
import { api } from '../../lib/api';
import { ModalAgregarVendedor } from './ModalAgregarVendedor';

interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
};

function etiquetaRol(rol: string): string {
  return ETIQUETAS_ROL[rol] ?? rol;
}

/**
 * Badge del vendedor actual. Al abrirlo lista a los vendedores registrados y
 * permite cambiar de cuenta con un clic (sin contraseña, pensado para una laptop
 * de oficina compartida), agregar uno nuevo, abrir "Mi cuenta" o cerrar sesión.
 * Mismo patrón de apertura/cierre que los desplegables de `NavPrincipal`
 * (clic, Escape, clic fuera).
 */
export function MenuCuenta() {
  const { usuario, cerrarSesion, cambiarDeCuenta, agregarVendedor } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cambiandoA, setCambiandoA] = useState<string | null>(null);
  const [errorCambio, setErrorCambio] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // La lista se pide cada vez que se abre: otro vendedor pudo darse de alta o desactivarse.
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    setErrorCambio(null);
    api
      .get<Vendedor[]>('/api/auth/vendedores')
      .then((lista) => vigente && setVendedores(lista))
      .catch(() => vigente && setErrorCambio('No se pudo cargar la lista de vendedores.'));
    return () => {
      vigente = false;
    };
  }, [abierto]);

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

  const manejarCambio = async (id: string) => {
    if (cambiandoA || id === usuario.id) return;
    setCambiandoA(id);
    setErrorCambio(null);
    try {
      await cambiarDeCuenta(id);
    } catch {
      setErrorCambio('No se pudo cambiar de cuenta.');
      setCambiandoA(null);
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
        <div className="absolute right-0 top-full pt-1 w-64 z-50 animate-fade-in">
          <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-[#00388d] truncate">{usuario.nombre}</p>
              <p className="text-[11px] text-gray-400 truncate">{usuario.email}</p>
            </div>
            <div className="border-b border-gray-100 py-1 max-h-56 overflow-y-auto">
              <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Vendedores
              </p>
              {vendedores.map((v) => {
                const actual = v.id === usuario.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => manejarCambio(v.id)}
                    disabled={cambiandoA !== null}
                    aria-current={actual ? 'true' : undefined}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-xs text-left transition-colors cursor-pointer disabled:opacity-60 ${
                      actual ? 'bg-blue-50 text-[#00388d] font-semibold' : 'hover:bg-blue-50'
                    }`}
                  >
                    <span className="w-6 h-6 bg-orange-200 text-[#00388d] rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">
                      {v.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">
                      {v.nombre}
                      {v.rol === 'admin' && <span className="ml-1 text-[10px] text-gray-400">(admin)</span>}
                    </span>
                    {actual && <Icono icon={Check} size={14} />}
                    {cambiandoA === v.id && <span className="text-[10px] text-gray-400">Entrando…</span>}
                  </button>
                );
              })}
              {errorCambio && <p className="px-4 py-1 text-[11px] text-red-500">{errorCambio}</p>}
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setModalAbierto(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#00388d] font-semibold hover:bg-blue-50 transition-colors text-left cursor-pointer"
              >
                <Icono icon={Plus} size={14} />
                Agregar Vendedor
              </button>
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

      {modalAbierto && (
        <ModalAgregarVendedor onCancelar={() => setModalAbierto(false)} onCrear={agregarVendedor} />
      )}
    </div>
  );
}
