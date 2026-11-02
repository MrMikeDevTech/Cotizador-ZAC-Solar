/**
 * Opciones predefinidas del método de pago (Paso 4) y su valor por defecto.
 *
 * El campo se guarda como texto libre (`Cotizacion.metodoPago`): estas son solo
 * las opciones que ofrece el selector, y cualquier otro texto es una condición
 * especial escrita a mano. Por eso el PDF imprime el valor tal cual.
 */
export const METODOS_PAGO = [
  'Contado / Transferencia',
  '50% Anticipo y 50% al finalizar',
  'Financiamiento Solar',
  'Tarjeta de Crédito / Débito',
  'Meses sin intereses',
] as const;

export const METODO_PAGO_POR_DEFECTO: string = METODOS_PAGO[0];

/**
 * Cotizaciones guardadas antes del selector traen `"Contado"`, que era el
 * valor por defecto de entonces. Equivale a la primera opción; se unifica para
 * que el selector la reconozca en vez de tratarla como texto personalizado.
 */
export function normalizarMetodoPago(valor: string | null | undefined): string {
  const limpio = (valor ?? '').trim();
  if (limpio === '' || limpio.toLowerCase() === 'contado') return METODO_PAGO_POR_DEFECTO;
  return limpio;
}

/** `true` si el valor es una de las opciones predefinidas (no texto personalizado). */
export function esMetodoPagoPredefinido(valor: string): boolean {
  return (METODOS_PAGO as readonly string[]).includes(valor);
}
