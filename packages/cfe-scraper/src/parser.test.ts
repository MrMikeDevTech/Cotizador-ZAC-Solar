import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTariffPage } from './parser.ts';

const fixturesDir = join(import.meta.dirname, '__fixtures__');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parseTariffPage', () => {
  test('1A verano 2025-07: 3 escalones con límites correctos', () => {
    const html = loadFixture('1A-2025-07-summer.html');
    const result = parseTariffPage(html);

    assert.ok(result !== null);
    assert.equal(result.season, 'summer');
    assert.equal(result.tiers.length, 3);

    const [tier0, tier1, tier2] = result.tiers;
    assert.ok(tier0 && tier1 && tier2);

    assert.equal(tier0.tierIndex, 0);
    assert.equal(tier0.price, 0.969);
    assert.equal(tier0.limitKwh, 100);

    assert.equal(tier1.tierIndex, 1);
    assert.equal(tier1.price, 1.123);
    assert.equal(tier1.limitKwh, 50);

    assert.equal(tier2.tierIndex, 2);
    assert.equal(tier2.price, 3.861);
    assert.equal(tier2.limitKwh, null);
  });

  test('1A fuera de verano 2025-01: 3 escalones con límites correctos', () => {
    const html = loadFixture('1A-2025-01-non-summer.html');
    const result = parseTariffPage(html);

    assert.ok(result !== null);
    assert.equal(result.season, 'non_summer');
    assert.equal(result.tiers.length, 3);

    const prices = result.tiers.map((t) => t.price);
    const limits = result.tiers.map((t) => t.limitKwh);
    assert.deepEqual(prices, [1.063, 1.29, 3.777]);
    assert.deepEqual(limits, [75, 75, null]);
  });

  test('1C verano 2025-07: 4 escalones, incluye intermedio bajo/alto', () => {
    const html = loadFixture('1C-2025-07-summer.html');
    const result = parseTariffPage(html);

    assert.ok(result !== null);
    assert.equal(result.season, 'summer');
    assert.equal(result.tiers.length, 4);

    const concepts = result.tiers.map((t) => t.concept);
    assert.deepEqual(concepts, [
      'Consumo básico',
      'Consumo intermedio bajo',
      'Consumo intermedio alto',
      'Consumo excedente',
    ]);

    const prices = result.tiers.map((t) => t.price);
    const limits = result.tiers.map((t) => t.limitKwh);
    assert.deepEqual(prices, [0.969, 1.123, 1.445, 3.861]);
    assert.deepEqual(limits, [150, 150, 150, null]);

    // tierIndex correlativo desde 0
    result.tiers.forEach((tier, index) => assert.equal(tier.tierIndex, index));
  });

  test('Tarifa 1 2025-07: solo fuera de verano, 3 escalones', () => {
    const html = loadFixture('1-2025-07.html');
    const result = parseTariffPage(html);

    assert.ok(result !== null);
    assert.equal(result.season, 'non_summer');
    assert.equal(result.tiers.length, 3);

    const prices = result.tiers.map((t) => t.price);
    const limits = result.tiers.map((t) => t.limitKwh);
    assert.deepEqual(prices, [1.087, 1.32, 3.861]);
    assert.deepEqual(limits, [75, 65, null]);
  });

  test('1A sin selección de mes: contenedor presente pero vacío -> null', () => {
    const html = loadFixture('1A-no-selection-empty.html');
    const result = parseTariffPage(html);
    assert.equal(result, null);
  });

  test('description conserva el texto original íntegro', () => {
    const html = loadFixture('1A-2025-07-summer.html');
    const result = parseTariffPage(html);

    assert.ok(result !== null);
    const tier0 = result.tiers[0];
    assert.ok(tier0);
    assert.equal(tier0.description, 'por cada uno de los primeros 100 (cien)');

    const tier2 = result.tiers[2];
    assert.ok(tier2);
    assert.equal(tier2.description, 'por cada kilowatt-hora adicional a los anteriores.');
  });

  test('html sin ninguno de los dos contenedores -> null', () => {
    const result = parseTariffPage('<html><body><p>sin datos</p></body></html>');
    assert.equal(result, null);
  });
});
