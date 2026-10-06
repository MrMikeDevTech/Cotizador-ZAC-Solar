import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { syncCfeRates } from './cfeRates.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { CfeClient, HiddenFields, TariffCode } from '@cotizador/cfe-scraper';

interface TierSpec {
  concept: string;
  price: number;
  description: string;
}

/** HTML mínimo que `parseTariffPage` entiende: un contenedor de temporada con N escalones. */
function seasonHtml(season: 'summer' | 'non_summer', tiers: TierSpec[]): string {
  const containerId = season === 'summer' ? 'ContentPlaceHolder1_TemporadaV' : 'ContentPlaceHolder1_TemporadaFV';
  const filas = tiers
    .map((t) => `<tr><td>${t.concept}</td><td>${t.price}</td><td>${t.description}</td></tr>`)
    .join('\n');
  return `<html><body><div id="${containerId}"><table>${filas}</table></div></body></html>`;
}

const TIERS_1A: TierSpec[] = [
  { concept: 'Consumo básico', price: 0.969, description: 'por cada uno de los primeros 100' },
  { concept: 'Consumo intermedio', price: 1.5, description: 'por cada uno de los siguientes 150' },
  { concept: 'Consumo excedente', price: 2.1, description: 'por cada kWh excedente' },
];

const TIERS_1C: TierSpec[] = [
  { concept: 'Consumo básico', price: 0.5, description: 'por cada uno de los primeros 100' },
  { concept: 'Consumo intermedio bajo', price: 1.0, description: 'por cada uno de los siguientes 100' },
  { concept: 'Consumo intermedio alto', price: 1.5, description: 'por cada uno de los siguientes 100' },
  { concept: 'Consumo excedente', price: 2.0, description: 'por cada kWh excedente' },
];

/** Doble de CfeClient: responde según el código de tarifa de la llamada, sin tocar la red. */
class FakeCfeClient implements CfeClient {
  private readonly responder: (tariffCode: TariffCode) => string;

  constructor(responder: (tariffCode: TariffCode) => string) {
    this.responder = responder;
  }

  async loadPage(): Promise<{ html: string; hidden: HiddenFields }> {
    // El doble no necesita campos ocultos: `submitPeriod` ignora lo que reciba aquí.
    return { html: '', hidden: {} };
  }

  async submitPeriod(input: { tariffCode: TariffCode }): Promise<string> {
    return this.responder(input.tariffCode);
  }
}

describe('syncCfeRates', () => {
  let dbPath: string;
  let prisma: PrismaClient;

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-cfe-sync-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('guarda los escalones esperados, incluyendo un caso de 4 escalones (tarifa 1C)', async () => {
    const client = new FakeCfeClient((tariffCode) =>
      tariffCode === '1C' ? seasonHtml('summer', TIERS_1C) : seasonHtml('summer', TIERS_1A),
    );

    const resumen = await syncCfeRates(
      prisma,
      { tariffs: ['1A', '1C'], year: 2025, months: [7], requestDelayMs: 0, fallbackToPreviousMonth: false },
      client,
    );

    assert.equal(resumen.saved, 3 + 4);
    assert.equal(resumen.missing, 0);
    assert.equal(resumen.errors, 0);
    assert.ok(resumen.durationMs >= 0);

    const filas1A = await prisma.cfeTariffRate.findMany({
      where: { tariffCode: '1A', year: 2025, month: 7, season: 'summer' },
      orderBy: { tierIndex: 'asc' },
    });
    assert.equal(filas1A.length, 3);
    assert.equal(filas1A[0]?.concept, 'Consumo básico');
    assert.equal(filas1A[0]?.price, 0.969);

    const filas1C = await prisma.cfeTariffRate.findMany({
      where: { tariffCode: '1C', year: 2025, month: 7, season: 'summer' },
      orderBy: { tierIndex: 'asc' },
    });
    assert.equal(filas1C.length, 4);
    assert.equal(filas1C[3]?.tierIndex, 3);
    assert.equal(filas1C[3]?.concept, 'Consumo excedente');
  });

  test('es idempotente: correr dos veces con los mismos datos no duplica filas', async () => {
    const client = new FakeCfeClient(() => seasonHtml('non_summer', TIERS_1A));
    const opciones = { tariffs: ['1B'] as TariffCode[], year: 2025, months: [1], requestDelayMs: 0, fallbackToPreviousMonth: false };

    const primera = await syncCfeRates(prisma, opciones, client);
    const conteoTrasPrimera = await prisma.cfeTariffRate.count({ where: { tariffCode: '1B' } });

    const segunda = await syncCfeRates(prisma, opciones, client);
    const conteoTrasSegunda = await prisma.cfeTariffRate.count({ where: { tariffCode: '1B' } });

    assert.equal(primera.saved, 3);
    assert.equal(segunda.saved, 3);
    assert.equal(conteoTrasPrimera, 3);
    assert.equal(conteoTrasSegunda, 3);
  });

  test('un precio distinto en una segunda corrida actualiza la fila existente, sin duplicarla', async () => {
    const opciones = { tariffs: ['1D'] as TariffCode[], year: 2025, months: [3], requestDelayMs: 0, fallbackToPreviousMonth: false };

    const clientePrecioOriginal = new FakeCfeClient(() => seasonHtml('non_summer', TIERS_1A));
    await syncCfeRates(prisma, opciones, clientePrecioOriginal);

    const tiersActualizados: TierSpec[] = TIERS_1A.map((t, i) => (i === 0 ? { ...t, price: 9.999 } : t));
    const clientePrecioNuevo = new FakeCfeClient(() => seasonHtml('non_summer', tiersActualizados));
    const resumen = await syncCfeRates(prisma, opciones, clientePrecioNuevo);

    const conteo = await prisma.cfeTariffRate.count({ where: { tariffCode: '1D' } });
    assert.equal(conteo, 3, 'no debe duplicar filas al actualizar un precio');
    assert.equal(resumen.saved, 3);

    const fila = await prisma.cfeTariffRate.findUnique({
      where: {
        tariffCode_year_month_season_tierIndex: {
          tariffCode: '1D',
          year: 2025,
          month: 3,
          season: 'non_summer',
          tierIndex: 0,
        },
      },
    });
    assert.equal(fila?.price, 9.999);
  });

  test('propaga fetchedAt a las filas, incluso al actualizar', async () => {
    const opciones = { tariffs: ['1E'] as TariffCode[], year: 2025, months: [5], requestDelayMs: 0, fallbackToPreviousMonth: false };
    const client = new FakeCfeClient(() => seasonHtml('summer', TIERS_1A));

    const antes = new Date();
    await syncCfeRates(prisma, opciones, client);
    await syncCfeRates(prisma, opciones, client);

    const fila = await prisma.cfeTariffRate.findUnique({
      where: {
        tariffCode_year_month_season_tierIndex: { tariffCode: '1E', year: 2025, month: 5, season: 'summer', tierIndex: 0 },
      },
    });
    assert.ok(fila);
    assert.ok(fila.fetchedAt instanceof Date);
    assert.ok(fila.fetchedAt.getTime() >= antes.getTime());
  });

  test('missing y errors reflejan periodos sin datos o fallidos, y el resumen cuadra con la DB', async () => {
    const clientVacio = new FakeCfeClient(() => '<html><body><p>sin datos</p></body></html>');

    const resumen = await syncCfeRates(
      prisma,
      { tariffs: ['1'], year: 2099, months: [12], requestDelayMs: 0, fallbackToPreviousMonth: false },
      clientVacio,
    );

    assert.equal(resumen.saved, 0);
    assert.equal(resumen.missing, 1);
    assert.equal(resumen.errors, 0);

    const conteo = await prisma.cfeTariffRate.count({ where: { tariffCode: '1', year: 2099 } });
    assert.equal(conteo, 0);
  });
});

describe('syncCfeRates — cuotas de DAC', () => {
  let dbPath: string;
  let prisma: PrismaClient;

  /** DAC publica por región: cargo fijo + precio plano, sin escalones. */
  const resultadoDac = {
    year: 2026,
    month: 7,
    fetchedAt: new Date('2026-07-01T00:00:00.000Z'),
    rates: [
      { region: 'Central', cargoFijo: 142.25, precioKwh: 6.529, precioKwhVerano: null },
      { region: 'Baja California', cargoFijo: 142.25, precioKwh: 5.453, precioKwhVerano: 6.348 },
    ],
  };

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'dac-sync-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('persiste una fila por región, con el precio de verano solo donde CFE lo distingue', async () => {
    const clienteVacio = {
      loadPage: async () => ({ html: '', hidden: {} }),
      submitPeriod: async () => '',
    };

    const r = await syncCfeRates(prisma, { year: 2026, months: [7], requestDelayMs: 0 }, clienteVacio, resultadoDac);
    assert.equal(r.dacSaved, 2);

    const central = await prisma.cfeDacRate.findUniqueOrThrow({
      where: { year_month_region: { year: 2026, month: 7, region: 'Central' } },
    });
    assert.equal(central.cargoFijo, 142.25);
    assert.equal(central.precioKwh, 6.529);
    assert.equal(central.precioKwhVerano, null, 'Central no distingue temporada');

    const bc = await prisma.cfeDacRate.findUniqueOrThrow({
      where: { year_month_region: { year: 2026, month: 7, region: 'Baja California' } },
    });
    assert.equal(bc.precioKwhVerano, 6.348, 'Baja California sí tiene precio de verano');
  });

  test('es idempotente y actualiza el precio en vez de duplicar', async () => {
    const clienteVacio = {
      loadPage: async () => ({ html: '', hidden: {} }),
      submitPeriod: async () => '',
    };

    const conPrecioNuevo = {
      ...resultadoDac,
      rates: [{ ...resultadoDac.rates[0]!, precioKwh: 7.111 }],
    };
    await syncCfeRates(prisma, { year: 2026, months: [7], requestDelayMs: 0 }, clienteVacio, conPrecioNuevo);

    assert.equal(await prisma.cfeDacRate.count(), 2, 'sigue habiendo dos filas, no cuatro');
    const central = await prisma.cfeDacRate.findUniqueOrThrow({
      where: { year_month_region: { year: 2026, month: 7, region: 'Central' } },
    });
    assert.equal(central.precioKwh, 7.111);
  });

  test('con cliente inyectado y sin resultado de DAC, no sale a la red', async () => {
    const clienteVacio = {
      loadPage: async () => ({ html: '', hidden: {} }),
      submitPeriod: async () => '',
    };
    const r = await syncCfeRates(prisma, { year: 2026, months: [7], requestDelayMs: 0 }, clienteVacio);
    assert.equal(r.dacSaved, 0, 'DAC se omite en tests para no depender de la red');
  });
});
