import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { scrapeTariffs } from './scraper.ts';
import type { CfeClient, HiddenFields, TariffCode } from './types.ts';

/** HTML mínimo que el parser entiende: un contenedor de temporada con un escalón. */
function seasonHtml(season: 'summer' | 'non_summer'): string {
  const containerId = season === 'summer' ? 'ContentPlaceHolder1_TemporadaV' : 'ContentPlaceHolder1_TemporadaFV';
  return `<html><body><div id="${containerId}"><table>
    <tr><td>Consumo básico</td><td>1.063</td><td>por cada uno de los primeros 75 (setenta y cinco)</td></tr>
  </table></div></body></html>`;
}

/** HTML sin ninguno de los dos contenedores: simula periodo no publicado. */
const EMPTY_HTML = '<html><body><p>sin datos</p></body></html>';

interface SubmitCall {
  tariffCode: TariffCode;
  year: number;
  month: number;
  summerStartMonth?: number;
}

/** Doble de CfeClient: registra las llamadas y responde según una función inyectada. */
class FakeCfeClient implements CfeClient {
  loadCalls: TariffCode[] = [];
  submitCalls: SubmitCall[] = [];

  private readonly responder: (call: SubmitCall) => string | 'throw';

  constructor(responder: (call: SubmitCall) => string | 'throw') {
    this.responder = responder;
  }

  async loadPage(tariffCode: TariffCode): Promise<{ html: string; hidden: HiddenFields }> {
    this.loadCalls.push(tariffCode);
    return { html: '', hidden: {} };
  }

  async submitPeriod(input: {
    tariffCode: TariffCode;
    hidden: HiddenFields;
    year: number;
    month: number;
    summerStartMonth?: number;
  }): Promise<string> {
    const call: SubmitCall = {
      tariffCode: input.tariffCode,
      year: input.year,
      month: input.month,
      summerStartMonth: input.summerStartMonth,
    };
    this.submitCalls.push(call);

    const outcome = this.responder(call);
    if (outcome === 'throw') throw new Error(`fallo simulado para ${input.tariffCode}`);
    return outcome;
  }
}

function previousMonthOf(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

describe('scrapeTariffs', () => {
  test('sin argumentos consulta el mes y año en curso', async () => {
    const now = new Date();
    const client = new FakeCfeClient(() => EMPTY_HTML);

    await scrapeTariffs({ tariffs: ['1'], fallbackToPreviousMonth: false, requestDelayMs: 0 }, client);

    assert.equal(client.submitCalls.length, 1);
    const call = client.submitCalls[0];
    assert.ok(call);
    assert.equal(call.year, now.getFullYear());
    assert.equal(call.month, now.getMonth() + 1);
  });

  test('Tarifa 1 hace una sola consulta por mes y sin summerStartMonth', async () => {
    const client = new FakeCfeClient(() => seasonHtml('non_summer'));

    const result = await scrapeTariffs(
      { tariffs: ['1'], months: [7], fallbackToPreviousMonth: false, requestDelayMs: 0 },
      client,
    );

    assert.equal(client.submitCalls.length, 1);
    const call = client.submitCalls[0];
    assert.ok(call);
    assert.equal(call.summerStartMonth, undefined);
    assert.equal(result.quotes.length, 1);
  });

  test('un mes con dos temporadas alcanzables (agosto) genera 2 sondeos y 2 quotes distintos', async () => {
    const client = new FakeCfeClient((call) => {
      // summerStart=2 -> agosto cae fuera de verano; summerStart=5 -> agosto cae en verano.
      return call.summerStartMonth === 2 ? seasonHtml('non_summer') : seasonHtml('summer');
    });

    const result = await scrapeTariffs(
      { tariffs: ['1A'], months: [8], fallbackToPreviousMonth: false, requestDelayMs: 0 },
      client,
    );

    assert.equal(client.submitCalls.length, 2);
    assert.equal(result.quotes.length, 2);
    const seasons = result.quotes.map((q) => q.season).sort();
    assert.deepEqual(seasons, ['non_summer', 'summer']);
  });

  test('un mes de una sola temporada (julio) hace 1 solo sondeo', async () => {
    const client = new FakeCfeClient(() => seasonHtml('summer'));

    const result = await scrapeTariffs(
      { tariffs: ['1A'], months: [7], fallbackToPreviousMonth: false, requestDelayMs: 0 },
      client,
    );

    assert.equal(client.submitCalls.length, 1);
    assert.equal(result.quotes.length, 1);
  });

  test('parseTariffPage devolviendo null produce un MissingPeriod, no una excepción', async () => {
    const client = new FakeCfeClient(() => EMPTY_HTML);

    const result = await scrapeTariffs(
      { tariffs: ['1'], months: [7], fallbackToPreviousMonth: false, requestDelayMs: 0 },
      client,
    );

    assert.equal(result.quotes.length, 0);
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0]?.reason, 'not_published');
    assert.equal(result.errors.length, 0);
  });

  test('un cliente que siempre lanza produce un ScrapeError y no rompe la corrida', async () => {
    const client = new FakeCfeClient(() => 'throw');

    const result = await scrapeTariffs(
      { tariffs: ['1'], months: [7], fallbackToPreviousMonth: false, requestDelayMs: 0 },
      client,
    );

    assert.equal(result.quotes.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]?.tariffCode, '1');
    // 3 intentos por el backoff de reintentos.
    assert.equal(client.submitCalls.length, 3);
  });

  test('el respaldo al mes anterior se dispara cuando el mes en curso no da nada', async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const expectedFallback = previousMonthOf(currentYear, currentMonth);

    const client = new FakeCfeClient((call) => {
      return call.month === currentMonth ? EMPTY_HTML : seasonHtml('non_summer');
    });

    const result = await scrapeTariffs({ tariffs: ['1'], requestDelayMs: 0 }, client);

    assert.equal(result.quotes.length, 1);
    assert.equal(result.quotes[0]?.month, expectedFallback.month);
    assert.equal(result.quotes[0]?.year, expectedFallback.year);

    // Se intentó primero el mes en curso y luego el anterior.
    const months = client.submitCalls.map((c) => c.month);
    assert.ok(months.includes(currentMonth));
    assert.ok(months.includes(expectedFallback.month));
  });
});
