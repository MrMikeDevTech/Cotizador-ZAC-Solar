import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from './migrador.ts';
import { crearClientePrisma } from './cliente.ts';
import { sembrarCatalogos } from './seed.ts';
import { LOCALIDADES_INICIALES } from '@cotizador/shared';
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
    // Municipios de Jalisco, Nayarit y los estados colindantes. Se compara
    // contra la propia semilla en vez de un número fijo: la lista crece al
    // ampliar la zona de cobertura y el test no debe romperse por ello.
    assert.equal(await prisma.localidad.count(), LOCALIDADES_INICIALES.length);
    assert.ok(LOCALIDADES_INICIALES.length > 100, 'la zona de cobertura debe traer municipios de varios estados');

    // Los catálogos sí se siembran (valores de arranque útiles); la empresa
    // no, porque es la identidad del usuario y no un valor por defecto.
    assert.equal(await prisma.empresa.count(), 0);

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
