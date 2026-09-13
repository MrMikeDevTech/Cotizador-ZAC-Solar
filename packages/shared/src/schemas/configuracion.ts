import { z } from 'zod';

export const panelSchema = z.object({
  clave: z.string().min(1),
  nombre: z.string().min(1),
  watts: z.number().positive(),
  factorBifacial: z.number().positive(),
  precioUnitario: z.number().min(0),
  activo: z.boolean().default(true),
  orden: z.number().default(0),
});

export const inversorSchema = z.object({
  clave: z.string().min(1),
  nombre: z.string().min(1),
  wattsMax: z.number().positive(),
  precioUnitario: z.number().min(0),
  activo: z.boolean().default(true),
  orden: z.number().default(0),
});

export const estructuraSchema = z.object({
  nombre: z.string().min(1),
  precio: z.number().min(0),
  activo: z.boolean().default(true),
  orden: z.number().default(0),
});

export const conceptoPlantillaSchema = z.object({
  concepto: z.string().min(1),
  costoBase: z.number().min(0),
  margenPorcentaje: z.number().default(0),
  orden: z.number().default(0),
  activo: z.boolean().default(true),
});

export const empresaSchema = z.object({
  nombre: z.string().min(1),
  telefono: z.string().default(''),
  localidad: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  descripcion: z.string().default(''),
  rfc: z.string().optional(),
});

export const factoresCalculoSchema = z.object({
  factorProduccion: z.number().positive(),
  pagoMinimoCfe: z.number().min(0),
  ivaPorcentaje: z.number().min(0),
  inflacionCfe: z.number().min(0),
  factorCo2: z.number().min(0),
  factorArboles: z.number().min(0),
  factorKmAuto: z.number().min(0),
  areaPorPanel: z.number().positive(),
  factoresEstacionales: z.array(z.number()).length(6),
  precioPanelDefault: z.number().min(0),
  precioInversorDefault: z.number().min(0),
});
