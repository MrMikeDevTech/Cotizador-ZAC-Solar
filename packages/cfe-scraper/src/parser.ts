import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import { CONTAINER_SUMMER, CONTAINER_NON_SUMMER } from './config.ts';
import type { Season, TariffTier } from './types.ts';

export interface ParsedPage {
  season: Season;
  tiers: TariffTier[];
}

/** Regex que distingue una fila de datos: el segundo td es un número con punto decimal opcional. */
const PRICE_RE = /^\d+(\.\d+)?$/;

/** Primer entero que aparece tras "primeros" o "siguientes" en la descripción. */
const LIMIT_RE = /\b(?:primeros|siguientes)\D*?(\d+)/i;

/** Normaliza el texto de una celda: colapsa espacios (incluido &nbsp;) y recorta. */
function normalizeCellText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractLimitKwh(description: string): number | null {
  const match = LIMIT_RE.exec(description);
  if (!match) return null;
  const [, digits] = match;
  if (digits === undefined) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isNaN(value) ? null : value;
}

/** Extrae los TariffTier de un contenedor de temporada (#TemporadaV o #TemporadaFV). */
function extractTiers(container: HTMLElement): TariffTier[] {
  const tiers: TariffTier[] = [];
  const rows = container.querySelectorAll('tr');

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    const conceptCell = cells[0];
    const priceCell = cells[1];
    const descriptionCell = cells[2];
    if (cells.length < 3 || conceptCell === undefined || priceCell === undefined || descriptionCell === undefined) {
      continue;
    }

    const priceText = normalizeCellText(priceCell.text);
    if (!PRICE_RE.test(priceText)) continue;

    const concept = normalizeCellText(conceptCell.text);
    const description = normalizeCellText(descriptionCell.text);
    const price = Number.parseFloat(priceText);

    tiers.push({
      tierIndex: tiers.length,
      concept,
      price,
      description,
      limitKwh: extractLimitKwh(description),
    });
  }

  return tiers;
}

/** Devuelve null cuando la página no trae cuotas (periodo no publicado o sin mes seleccionado). */
export function parseTariffPage(html: string): ParsedPage | null {
  const root = parse(html);

  const summerContainer = root.querySelector(CONTAINER_SUMMER);
  if (summerContainer) {
    const tiers = extractTiers(summerContainer);
    if (tiers.length === 0) return null;
    return { season: 'summer', tiers };
  }

  const nonSummerContainer = root.querySelector(CONTAINER_NON_SUMMER);
  if (nonSummerContainer) {
    const tiers = extractTiers(nonSummerContainer);
    if (tiers.length === 0) return null;
    return { season: 'non_summer', tiers };
  }

  return null;
}
