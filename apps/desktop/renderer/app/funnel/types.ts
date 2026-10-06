export interface ContactoResumen {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export interface ProyectoFunnel {
  id: string;
  codigo: string;
  nombre: string;
  ordenEnFase: number;
  contacto: ContactoResumen;
  /** Monto total de la última cotización del proyecto; `null` si aún no tiene ninguna. */
  granTotal: number | null;
}

export interface FaseFunnel {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  color: string;
  /** Fases sembradas por la migración (borrador, cotizado, enviado, vendido, perdido). No se pueden borrar. */
  esSistema: boolean;
}

export interface FaseConProyectos extends FaseFunnel {
  proyectos: ProyectoFunnel[];
}

/** Elemento que se está arrastrando en el tablero: una tarjeta (proyecto) o una columna (fase). */
export interface ArrastreActivo {
  id: string;
  tipo: 'tarjeta' | 'columna';
}
