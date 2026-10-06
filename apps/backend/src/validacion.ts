import { zValidator as zValidatorBase } from '@hono/zod-validator';
import type { ZodType } from 'zod';

/** Dónde vive el dato a validar: cuerpo JSON, query string o parámetros de ruta. */
type Target = 'json' | 'query' | 'param';

/** Envuelve zValidator para que los errores de validación usen el mismo formato { error: { codigo, mensaje, detalles } } que el resto de la API. */
export function zValidator<T extends ZodType>(target: Target, schema: T) {
  return zValidatorBase(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { codigo: 'VALIDACION', mensaje: 'Datos inválidos', detalles: result.error.issues } },
        400
      );
    }
  });
}
