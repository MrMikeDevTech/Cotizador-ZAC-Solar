export type TipoColumna = 'Lead' | 'Gestión Comercial' | 'Arranque';

export interface TarjetaFunnel {
  id: string;
  estatus: string;
  cliente: string;
  proyecto: string;
  autor: string;
  tarifa: string;
  ultimoPaso: string;
  costoEstimado: number;
  columna: TipoColumna;
}

export interface ColumnaConfig {
  clave: TipoColumna;
  titulo: string;
}
