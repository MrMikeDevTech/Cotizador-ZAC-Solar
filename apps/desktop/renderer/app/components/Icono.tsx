import type { LucideIcon } from 'lucide-react';

interface IconoProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

/**
 * Envoltorio delgado sobre lucide-react para que todo el proyecto use el
 * mismo tamaño y grosor de trazo. Los iconos son decorativos por defecto
 * (`aria-hidden`); si un icono necesita significado accesible, quien lo usa
 * debe aportar el texto (p. ej. con `aria-label` en el botón contenedor).
 */
export function Icono({ icon: Icon, size = 18, className = '' }: IconoProps) {
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={`shrink-0 text-current ${className}`}
      aria-hidden="true"
    />
  );
}
