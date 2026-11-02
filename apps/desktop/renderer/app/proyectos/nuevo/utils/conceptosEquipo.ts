import { PRECIO_BASE_POR_PANEL } from '@cotizador/shared';
import type { ConceptoCotizacion } from '../types';

/**
 * Los conceptos de paneles e inversores de la cotización se recalculan con el
 * catálogo. Se reconocen por el id de la plantilla (`'1'` / `'2'`, en un proyecto
 * nuevo) o por su nombre exacto: al reabrir un proyecto guardado los ids son los
 * uuid de la base y solo el nombre identifica el concepto.
 */

type ConceptoMinimo = Pick<ConceptoCotizacion, 'id' | 'concepto'>;

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase();

export function esConceptoDePaneles(c: ConceptoMinimo): boolean {
  return c.id === '1' || normalizar(c.concepto) === 'precio de paneles';
}

export function esConceptoDeInversores(c: ConceptoMinimo): boolean {
  return c.id === '2' || normalizar(c.concepto) === 'precio de inversores';
}

/**
 * Conceptos que se cobran **por panel**. Devuelven el costo base de un panel, o
 * `null` si el concepto no es de este tipo. Se reconocen igual que los de paneles
 * e inversores: por id de plantilla o por nombre exacto.
 */
export function precioBasePorPanel(c: ConceptoMinimo): number | null {
  const nombre = normalizar(c.concepto);
  if (c.id === '3' || nombre === 'precio material eléctrico') return PRECIO_BASE_POR_PANEL.materialElectrico;
  if (c.id === '4' || nombre === 'mano de obra') return PRECIO_BASE_POR_PANEL.manoDeObra;
  if (c.id === '5' || nombre === 'estructura de aluminio') return PRECIO_BASE_POR_PANEL.estructuraAluminio;
  return null;
}
