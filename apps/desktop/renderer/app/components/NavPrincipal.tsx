'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Icono } from './Icono';
import { MenuCuenta } from './MenuCuenta';

interface EnlaceNav {
  href: string;
  etiqueta: string;
}

const ENLACES_CRM: EnlaceNav[] = [
  { href: '/crm/usuarios', etiqueta: 'Usuarios' },
  { href: '/crm/tareas', etiqueta: 'Tareas' },
  { href: '/crm/calendario', etiqueta: 'Calendario' },
  { href: '/crm/reportes', etiqueta: 'Reportes' },
];

const ENLACES_CONFIGURACION: EnlaceNav[] = [
  { href: '/config/catalogo', etiqueta: 'Catálogo' },
  { href: '/config/utilidad', etiqueta: 'Utilidad' },
  { href: '/config/cotizacion', etiqueta: 'Formato de Cotización' },
  { href: '/config/historial', etiqueta: 'Historial de cotizaciones' },
];

const ENLACES_PRINCIPALES: EnlaceNav[] = [
  { href: '/', etiqueta: 'Dashboard' },
  { href: '/contactos', etiqueta: 'Contacto' },
  { href: '/proyectos', etiqueta: 'Proyectos' },
  { href: '/funnel', etiqueta: 'Funnel de ventas' },
];

/**
 * Desplegable de escritorio. Antes era `group-hover` puro CSS (inútil con
 * teclado); ahora también abre con clic/foco, cierra con Escape o al hacer
 * clic fuera, y usa `ChevronDown` de lucide en vez del carácter `▾`.
 */
function MenuDesplegable({ etiqueta, enlaces }: { etiqueta: string; enlaces: EnlaceNav[] }) {
  const [abierto, setAbierto] = useState(false);
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

  return (
    <div ref={contenedorRef} className="relative py-2" onBlur={manejarBlur}>
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="hover:text-orange-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded flex items-center gap-1 font-medium"
      >
        {etiqueta}
        <Icono
          icon={ChevronDown}
          size={14}
          className={`transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && (
        <div className="absolute left-0 top-full pt-1 w-48 z-50 animate-fade-in">
          <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            {enlaces.map((enlace, indice) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                onClick={() => setAbierto(false)}
                className={`block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors ${
                  indice < enlaces.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                {enlace.etiqueta}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Navegación principal, extraída del layout. En móvil el nav completo vivía
 * dentro de un `hidden md:flex`, sin forma de navegar; ahora hay un menú de
 * hamburguesa (`Menu` / `X`) que despliega los mismos enlaces.
 */
export function NavPrincipal() {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    if (!menuMovilAbierto) return;
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuMovilAbierto(false);
    };
    document.addEventListener('keydown', manejarTeclado);
    return () => document.removeEventListener('keydown', manejarTeclado);
  }, [menuMovilAbierto]);

  return (
    <nav className="bg-[#00388d] w-full px-4 md:px-8 py-3 shadow-lg text-white relative z-50">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0 hover:opacity-90 transition-opacity">
          <img src="/logo.jpeg" alt="Zac-Solar" className="h-10 w-auto object-contain rounded-lg" />
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-between text-sm pr-4">
          <div className="flex items-center gap-8">
            {ENLACES_PRINCIPALES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className="hover:text-orange-200 transition-colors font-medium"
              >
                {enlace.etiqueta}
              </Link>
            ))}
            <MenuDesplegable etiqueta="CRM" enlaces={ENLACES_CRM} />
            <MenuDesplegable etiqueta="Configuración" enlaces={ENLACES_CONFIGURACION} />
          </div>

          <MenuCuenta />
        </div>

        <button
          type="button"
          onClick={() => setMenuMovilAbierto((previo) => !previo)}
          aria-label={menuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuMovilAbierto}
          className="md:hidden p-2 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Icono icon={menuMovilAbierto ? X : Menu} size={22} />
        </button>
      </div>

      {menuMovilAbierto && (
        <div className="md:hidden mt-3 pb-2 flex flex-col gap-1 text-sm animate-fade-in">
          {ENLACES_PRINCIPALES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuMovilAbierto(false)}
              className="px-2 py-2.5 rounded-lg hover:bg-blue-800 transition-colors font-medium"
            >
              {enlace.etiqueta}
            </Link>
          ))}

          <div className="border-t border-blue-400/30 my-1" />
          <span className="px-2 pt-1 text-xs uppercase tracking-wide text-blue-200">CRM</span>
          {ENLACES_CRM.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuMovilAbierto(false)}
              className="px-2 py-2.5 rounded-lg hover:bg-blue-800 transition-colors"
            >
              {enlace.etiqueta}
            </Link>
          ))}

          <div className="border-t border-blue-400/30 my-1" />
          <span className="px-2 pt-1 text-xs uppercase tracking-wide text-blue-200">Configuración</span>
          {ENLACES_CONFIGURACION.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuMovilAbierto(false)}
              className="px-2 py-2.5 rounded-lg hover:bg-blue-800 transition-colors"
            >
              {enlace.etiqueta}
            </Link>
          ))}

          <div className="border-t border-blue-400/30 my-1 pt-2 px-2">
            <MenuCuenta />
          </div>
        </div>
      )}
    </nav>
  );
}
