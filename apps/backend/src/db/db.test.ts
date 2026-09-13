import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from './migrador.ts';
import { crearClientePrisma } from './cliente.ts';
import { sembrarCatalogos } from './seed.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';

describe('migrador + seed', () => {
  let dbPath: string;
  let prisma: PrismaClient;

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-db-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('las migraciones crean las tablas esperadas', async () => {
    // si las tablas no existieran, cualquiera de estos count() lanzaría
    await assert.doesNotReject(() => prisma.contacto.count());
    await assert.doesNotReject(() => prisma.proyecto.count());
    await assert.doesNotReject(() => prisma.cotizacion.count());
    await assert.doesNotReject(() => prisma.panel.count());
  });

  test('sembrarCatalogos puebla los catálogos con los valores por defecto', async () => {
    await sembrarCatalogos(prisma);

    assert.equal(await prisma.panel.count(), 6);
    assert.equal(await prisma.inversor.count(), 14);
    assert.equal(await prisma.estructura.count(), 6);
    assert.equal(await prisma.conceptoPlantilla.count(), 4);
    assert.equal(await prisma.tarifa.count(), 10);
    assert.equal(await prisma.localidad.count(), 9);

    const empresa = await prisma.empresa.findUnique({ where: { id: '1' } });
    assert.equal(empresa?.nombre, 'Energy Sun');

    const factores = await prisma.factoresCalculo.findUnique({ where: { id: '1' } });
    assert.equal(factores?.pagoMinimoCfe, 60);
  });

  test('sembrarCatalogos es idempotente (no duplica en una segunda corrida)', async () => {
    await sembrarCatalogos(prisma);
    await sembrarCatalogos(prisma);

    assert.equal(await prisma.panel.count(), 6);
    assert.equal(await prisma.inversor.count(), 14);
  });

  test('ejecutarMigraciones es idempotente (no re-aplica migraciones ya registradas)', () => {
    // no debe lanzar ni duplicar tablas al volver a correr sobre la misma DB
    assert.doesNotThrow(() => ejecutarMigraciones(dbPath));
  });
});
