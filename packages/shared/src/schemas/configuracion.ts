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
  // `nullish` y no `optional`: en la base `rfc` es `String?`, así que
  // `GET /api/config` devuelve `rfc: null` cuando no se ha capturado. La
  // pantalla de Configuración reenvía la empresa tal cual la recibió, y con
  // `optional()` ese `null` hacía fallar **todo** el guardado con un genérico
  // "Datos inválidos" — el usuario veía que no podía cambiar ni un campo, y
  // el mensaje culpaba al correo. Un esquema de escritura tiene que aceptar
  // lo que su propio GET devuelve.
  rfc: z.string().nullish(),
  tituloCotizacion: z.string().default(''),
  introPlantilla: z.string().default(''),
  observaciones: z.string().default(''),
  firmaNombre: z.string().default(''),
  firmaPuesto: z.string().default(''),
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
