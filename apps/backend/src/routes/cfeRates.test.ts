import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { crearApp } from '../app.ts';
import { crearAdminConSesion } from '../test-helpers/auth.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { Hono } from 'hono';

describe('CFE Rates Routes', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let authHeaders: Record<string, string>;

  /** Helper que manda el header de sesión en cada petición, para no repetir el login en cada test. */
  async function req(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(path, { ...init, headers: { ...authHeaders, ...(init.headers as Record<string, string> | undefined) } });
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-cfe-rates-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    app = crearApp(prisma);
    ({ headers: authHeaders } = await crearAdminConSesion(prisma));
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /api/cfe-rates/status con tabla vacía devuelve 200 con totalRows: 0', async () => {
    const res = await req('/api/cfe-rates/status');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.totalRows, 0);
    assert.equal(body.lastFetchedAt, null);
    assert.deepEqual(body.periods, []);
  });

  test('GET /api/cfe-rates con tarifa válida y datos existentes devuelve escalones ordenados por tierIndex', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1A',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.969,
          description: 'Hasta 100 kWh',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1A',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 1,
          concept: 'Consumo intermedio',
          price: 1.234,
          description: 'De 101 a 250 kWh',
          limitKwh: 250,
          fetchedAt: now,
        },
        {
          tariffCode: '1A',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 2,
          concept: 'Consumo excedente',
          price: 1.789,
          description: 'Más de 250 kWh',
          limitKwh: null,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates?tariff=1A&year=2025&month=7');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.tariffCode, '1A');
    assert.equal(body.year, 2025);
    assert.equal(body.month, 7);
    assert.equal(body.seasons.length, 1);
    assert.equal(body.seasons[0].season, 'summer');
    assert.equal(body.seasons[0].tiers.length, 3);
    // Verificar que están ordenados por tierIndex
    assert.equal(body.seasons[0].tiers[0].tierIndex, 0);
    assert.equal(body.seasons[0].tiers[1].tierIndex, 1);
    assert.equal(body.seasons[0].tiers[2].tierIndex, 2);
    // Verificar contenido
    assert.equal(body.seasons[0].tiers[0].concept, 'Consumo básico');
    assert.equal(body.seasons[0].tiers[0].price, 0.969);
    assert.equal(body.seasons[0].tiers[0].limitKwh, 100);
    assert.equal(body.seasons[0].tiers[2].limitKwh, null);
  });

  test('GET /api/cfe-rates con 4 escalones (tarifa 1C) devuelve todos', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1C',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.5,
          description: 'Tier 0',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1C',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 1,
          concept: 'Consumo intermedio bajo',
          price: 1.0,
          description: 'Tier 1',
          limitKwh: 200,
          fetchedAt: now,
        },
        {
          tariffCode: '1C',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 2,
          concept: 'Consumo intermedio alto',
          price: 1.5,
          description: 'Tier 2',
          limitKwh: 300,
          fetchedAt: now,
        },
        {
          tariffCode: '1C',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 3,
          concept: 'Consumo excedente',
          price: 2.0,
          description: 'Tier 3',
          limitKwh: null,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates?tariff=1C&year=2025&month=7');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.seasons[0].tiers.length, 4);
    assert.equal(body.seasons[0].tiers[0].tierIndex, 0);
    assert.equal(body.seasons[0].tiers[1].tierIndex, 1);
    assert.equal(body.seasons[0].tiers[2].tierIndex, 2);
    assert.equal(body.seasons[0].tiers[3].tierIndex, 3);
  });

  test('GET /api/cfe-rates filtrado por season=summer devuelve solo esa temporada', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1B',
          year: 2025,
          month: 7,
          season: 'summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.9,
          description: 'Summer tier 0',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1B',
          year: 2025,
          month: 7,
          season: 'non_summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.8,
          description: 'Non-summer tier 0',
          limitKwh: 100,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates?tariff=1B&year=2025&month=7&season=summer');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.seasons.length, 1);
    assert.equal(body.seasons[0].season, 'summer');
    assert.equal(body.seasons[0].tiers[0].price, 0.9);
  });

  test('GET /api/cfe-rates sin season devuelve ambas temporadas', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1',
          year: 2025,
          month: 1,
          season: 'summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.95,
          description: 'Summer',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1',
          year: 2025,
          month: 1,
          season: 'non_summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 0.85,
          description: 'Non-summer',
          limitKwh: 100,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates?tariff=1&year=2025&month=1');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.seasons.length, 2);
    // Verificar que summer viene primero (según el ordenamiento)
    assert.equal(body.seasons[0].season, 'summer');
    assert.equal(body.seasons[1].season, 'non_summer');
  });

  test('GET /api/cfe-rates con periodo sin datos responde 404 con NO_ENCONTRADO', async () => {
    const res = await req('/api/cfe-rates?tariff=1D&year=2099&month=12');
    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'NO_ENCONTRADO');
  });

  test('GET /api/cfe-rates con tariff inválido responde 400 con VALIDACION', async () => {
    const res = await req('/api/cfe-rates?tariff=INVALID&year=2025&month=7');
    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'VALIDACION');
  });

  test('GET /api/cfe-rates con month=99 responde 400 con VALIDACION', async () => {
    const res = await req('/api/cfe-rates?tariff=1A&year=2025&month=99');
    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'VALIDACION');
  });

  test('GET /api/cfe-rates sin tariff responde 400 con VALIDACION', async () => {
    const res = await req('/api/cfe-rates?year=2025&month=7');
    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'VALIDACION');
  });

  test('GET /api/cfe-rates/status con datos devuelve lastFetchedAt no nulo y periods no vacío', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1E',
          year: 2025,
          month: 3,
          season: 'summer',
          tierIndex: 0,
          concept: 'Consumo básico',
          price: 1.1,
          description: 'Desc 1',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1E',
          year: 2025,
          month: 3,
          season: 'summer',
          tierIndex: 1,
          concept: 'Consumo intermedio',
          price: 1.5,
          description: 'Desc 2',
          limitKwh: 200,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates/status');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.ok(body.lastFetchedAt !== null);
    assert.equal(typeof body.lastFetchedAt, 'string'); // fecha en ISO
    assert.ok(body.totalRows > 0);
    assert.ok(body.periods.length > 0);
    const period1E = body.periods.find((p: any) => p.tariffCode === '1E' && p.month === 3);
    assert.ok(period1E);
    assert.equal(period1E.year, 2025);
    assert.equal(period1E.season, 'summer');
    assert.equal(period1E.tierCount, 2);
  });

  test('GET /api/cfe-rates/status período con 4 escalones reporta tierCount=4', async () => {
    const now = new Date();
    await prisma.cfeTariffRate.createMany({
      data: [
        {
          tariffCode: '1F',
          year: 2025,
          month: 6,
          season: 'non_summer',
          tierIndex: 0,
          concept: 'Tier 0',
          price: 0.5,
          description: 'D0',
          limitKwh: 100,
          fetchedAt: now,
        },
        {
          tariffCode: '1F',
          year: 2025,
          month: 6,
          season: 'non_summer',
          tierIndex: 1,
          concept: 'Tier 1',
          price: 1.0,
          description: 'D1',
          limitKwh: 200,
          fetchedAt: now,
        },
        {
          tariffCode: '1F',
          year: 2025,
          month: 6,
          season: 'non_summer',
          tierIndex: 2,
          concept: 'Tier 2',
          price: 1.5,
          description: 'D2',
          limitKwh: 300,
          fetchedAt: now,
        },
        {
          tariffCode: '1F',
          year: 2025,
          month: 6,
          season: 'non_summer',
          tierIndex: 3,
          concept: 'Tier 3',
          price: 2.0,
          description: 'D3',
          limitKwh: null,
          fetchedAt: now,
        },
      ],
    });

    const res = await req('/api/cfe-rates/status');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    const period1F = body.periods.find((p: any) => p.tariffCode === '1F');
    assert.equal(period1F.tierCount, 4);
  });
});
