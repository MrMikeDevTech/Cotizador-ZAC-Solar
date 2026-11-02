import { z } from 'zod';

/**
 * Datos que se extraen de un recibo CFE. Se valida con zod en el borde del
 * backend (lo que devuelve el endpoint) y el frontend lo infiere de aquí, de
 * modo que ambos lados hablan del mismo contrato.
 *
 * Todo texto viene en Title Case y sin saltos ni espacios dobles; lo que no
 * se pudo leer queda como cadena vacía (o `null`/lista corta) y el motivo en
 * `advertencias` del resultado — nunca se inventa un dato.
 */

export const consumoReciboCfeSchema = z.object({
  /** Inicio del periodo, `YYYY-MM-DD`. */
  inicio: z.string(),
  /** Fin del periodo, `YYYY-MM-DD`. */
  termino: z.string(),
  kwh: z.number().int().nonnegative(),
  /** Importe facturado del periodo, en MXN. */
  importe: z.number().nonnegative(),
});

export const reciboCfeParseadoSchema = z.object({
  /** Titular, en el orden en que lo imprime CFE (apellidos primero). */
  nombreCliente: z.string(),
  /** `${nombreCliente} - ${localidad}`. */
  nombreProyecto: z.string(),
  /** Desglose del titular; es una heurística "APELLIDOS NOMBRE" y se debe revisar. */
  contacto: z.object({
    nombre: z.string(),
    apellidoPaterno: z.string(),
    apellidoMaterno: z.string(),
  }),
  /** 12 dígitos. */
  numeroServicio: z.string(),
  tarifa: z.string(),
  hilos: z.enum(['', '1 hilo', '2 hilos', '3 hilos']),
  localidad: z.string(),
  municipio: z.string(),
  /** Nombre oficial de `estadosMexico`, o vacío si la abreviatura no se reconoció. */
  estado: z.string(),
  codigoPostal: z.string(),
  /** Alfanumérico (p. ej. `5GRR02`); vacío si no se leyó. */
  numeroMedidor: z.string(),
  /** Calle, colonia, municipio y estado, sin el código postal. */
  direccion: z.string(),
  periodoFacturado: z.object({ inicio: z.string(), termino: z.string() }).nullable(),
  /** Deducido de la duración de los periodos del histórico. */
  periodo: z.enum(['Bimestral', 'Mensual']).nullable(),
  /** Inicio del periodo más reciente del histórico (`YYYY-MM-DD`); lo usa el Paso 2. */
  fechaInicio: z.string(),
  /** Los 6 periodos más recientes del histórico, del más reciente al más antiguo. */
  consumosHistoricos: z.array(consumoReciboCfeSchema).max(6),
});

export const resultadoReciboCfeSchema = z.object({
  datos: reciboCfeParseadoSchema,
  advertencias: z.array(z.string()),
  /** De dónde salió el texto: capa de texto del PDF, o OCR cuando estaba dañada. */
  origenTexto: z.enum(['pdf', 'ocr']),
});

export type ConsumoReciboCfe = z.infer<typeof consumoReciboCfeSchema>;
export type ReciboCfeParseado = z.infer<typeof reciboCfeParseadoSchema>;
export type ResultadoReciboCfe = z.infer<typeof resultadoReciboCfeSchema>;
