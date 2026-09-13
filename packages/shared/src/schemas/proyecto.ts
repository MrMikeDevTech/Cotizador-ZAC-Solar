import { z } from 'zod';
import { datosContactoSchema } from './contacto.ts';

export const consumoPeriodoSchema = z.object({
  inicioStr: z.string().default(''),
  terminoStr: z.string().default(''),
  kwh: z.string().default('0'),
  pago: z.string().default('0'),
});

export const datosProyectoSchema = z.object({
  nombreProyecto: z.string().default(''),
  localidadConsumo: z.string().default(''),
  hilos: z.string().default('1 hilo'),
  nombreRecibo: z.string().default(''),
  numeroServicio: z.string().default(''),
  ivaCFE: z.number().default(16),
  porcentajeDap: z.string().default(''),
  usarNuevaTarifa: z.boolean().default(false),
  tarifaSeleccionada: z.string().default('1A'),
  aplicarDac: z.boolean().default(false),
  aplicarDap: z.boolean().default(false),
  fechaInicio: z.string().default(''),
  periodo: z.string().default('Bimestral'),
  consumos: z.array(consumoPeriodoSchema).length(6),
});

export const equipoSeleccionadoSchema = z.object({
  panelClave: z.string().min(1, 'Debe seleccionar un panel'),
  cantPaneles: z.number().min(0),
  inversorClave: z.string().default(''),
  cantInversores: z.number().min(0),
});

export const cargoEditableSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  monto: z.number(),
});

export const conceptoCotizacionSchema = z.object({
  id: z.string(),
  concepto: z.string(),
  costoBase: z.number(),
  margenPorcentaje: z.number(),
});

export const otrosCargosSchema = z.object({
  estructuraId: z.string().nullable().default(null),
  metodoPrecio: z.enum(['unitario', 'watt', 'panel']).default('unitario'),
  incluirIva: z.boolean().default(false),
  tipoMoneda: z.enum(['MXN', 'USD']).default('MXN'),
  valorDolar: z.number().default(16.9),
  ocultarDesglose: z.boolean().default(false),
  descuento5: z.boolean().default(false),
  descuento10: z.boolean().default(false),
  cargosEditables: z.array(cargoEditableSchema).default([]),
  conceptos: z.array(conceptoCotizacionSchema).default([]),
});

export const guardarProyectoSchema = z.object({
  datosContacto: datosContactoSchema,
  datosProyecto: datosProyectoSchema,
  equipo: equipoSeleccionadoSchema,
  otrosCargos: otrosCargosSchema,
  estatus: z.enum(['borrador', 'cotizado', 'enviado', 'vendido', 'perdido']).default('borrador'),
  pasoActual: z.number().min(1).max(5).default(1),
});

export type GuardarProyectoInput = z.infer<typeof guardarProyectoSchema>;
