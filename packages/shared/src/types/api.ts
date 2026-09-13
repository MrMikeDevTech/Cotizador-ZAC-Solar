import type { ConsumoPeriodo, DatosContacto, CargoEditable, ConceptoCotizacion, MetodoPrecio, TipoMoneda, EstatusProyecto } from './dominio.ts';

export interface EquipoSeleccionado {
  panelClave: string;
  cantPaneles: number;
  inversorClave: string;
  cantInversores: number;
}

export interface OtrosCargosPayload {
  estructuraId: string | null;
  metodoPrecio: MetodoPrecio;
  incluirIva: boolean;
  tipoMoneda: TipoMoneda;
  valorDolar: number;
  ocultarDesglose: boolean;
  descuento5: boolean;
  descuento10: boolean;
  cargosEditables: CargoEditable[];
  conceptos: ConceptoCotizacion[];
}

export interface DatosProyectoPayload {
  nombreProyecto: string;
  localidadConsumo: string;
  hilos: string;
  nombreRecibo: string;
  numeroServicio: string;
  ivaCFE: number;
  porcentajeDap: string;
  usarNuevaTarifa: boolean;
  tarifaSeleccionada: string;
  aplicarDac: boolean;
  aplicarDap: boolean;
  fechaInicio: string;
  periodo: string;
  consumos: ConsumoPeriodo[];
}

export interface GuardarProyectoPayload {
  datosContacto: DatosContacto;
  datosProyecto: DatosProyectoPayload;
  equipo: EquipoSeleccionado;
  otrosCargos: OtrosCargosPayload;
  estatus: EstatusProyecto;
  pasoActual: number;
}

export interface ApiError {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: unknown;
  };
}
