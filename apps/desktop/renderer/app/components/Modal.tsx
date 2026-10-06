'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { Icono } from './Icono';

type TamanoModal = 'sm' | 'md' | 'lg';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: ReactNode;
  tamano?: TamanoModal;
  footer?: ReactNode;
}

const ANCHOS_POR_TAMANO: Record<TamanoModal, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

/**
 * Duración (ms) que se espera antes de desmontar tras pedir el cierre.
 * Debe ser >= a la duración real de `animate-fade-out` / `animate-scale-out`
 * definidas en globals.css, para que la animación de salida se vea completa.
 */
const DURACION_CIERRE_MS = 180;

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal base del proyecto. Sustituye a las ~7 implementaciones casi
 * idénticas que existían, cada una sin animación de salida, sin foco
 * atrapado y con íconos de cierre inconsistentes (`✕`, `&times;`).
 */
export function Modal({ abierto, onCerrar, titulo, children, tamano = 'md', footer }: ModalProps) {
  const [montado, setMontado] = useState(abierto);
  const [cerrando, setCerrando] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);
  const idTitulo = useId();

  // Monta de inmediato al abrir. Al cerrar, mantiene el modal montado
  // "cerrando" durante DURACION_CIERRE_MS para que la animación de salida
  // termine de reproducirse antes de desmontar (un simple `{abierto && ...}`
  // desmontaría de golpe y la salida nunca se vería).
  useEffect(() => {
    if (abierto) {
      setMontado(true);
      setCerrando(false);
      return;
    }
    setCerrando(true);
    const temporizador = setTimeout(() => {
      setMontado(false);
      setCerrando(false);
    }, DURACION_CIERRE_MS);
    return () => clearTimeout(temporizador);
  }, [abierto]);

  // Bloquea el scroll del body mientras el modal está montado (incluye la
  // animación de salida) y lo restaura al desmontar.
  useEffect(() => {
    if (!montado) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [montado]);

  // `onCerrar` suele llegar como función inline (`onCerrar={() => setAbierto(false)}`),
  // así que cambia de identidad en cada render del padre. Guardarla en un ref
  // permite que los efectos de abajo NO dependan de ella: si dependieran, cada
  // render re-ejecutaría su limpieza y el foco saltaría de vuelta al primer
  // campo del panel — escribir en un formulario dentro del modal sería imposible.
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  });

  // Captura el foco al montar y lo devuelve al desmontar. Depende solo de
  // `montado`, de modo que se ejecuta una vez por apertura.
  useEffect(() => {
    if (!montado) return;

    elementoPrevioRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const primerFoco = panel?.querySelector<HTMLElement>(SELECTOR_ENFOCABLES);
    (primerFoco ?? panel)?.focus();

    return () => {
      elementoPrevioRef.current?.focus?.();
    };
  }, [montado]);

  // Escape y foco atrapado. Los enfocables se recalculan en cada pulsación para
  // que funcione con contenido dinámico (p. ej. la lista de cargos editables).
  useEffect(() => {
    if (!montado) return;

    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        onCerrarRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !panelRef.current) return;

      const enfocables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
      );
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!primero || !ultimo) return;

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTeclado);
    return () => document.removeEventListener('keydown', manejarTeclado);
  }, [montado]);

  if (!montado) return null;

  const manejarClicBackdrop = (evento: ReactMouseEvent<HTMLDivElement>) => {
    if (evento.target === evento.currentTarget) {
      onCerrar();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${
        cerrando ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onMouseDown={manejarClicBackdrop}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        tabIndex={-1}
        className={`relative w-full ${ANCHOS_POR_TAMANO[tamano]} bg-white rounded-2xl shadow-2xl outline-none ${
          cerrando ? 'animate-scale-out' : 'animate-scale-in'
        }`}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-full p-1.5 hover:bg-gray-100"
        >
          <Icono icon={X} size={18} />
        </button>

        <div className="p-6">
          {titulo && (
            <h2 id={idTitulo} className="text-sm font-bold text-[#00388d] mb-4 pr-6">
              {titulo}
            </h2>
          )}
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
