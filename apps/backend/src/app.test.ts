import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from './db/migrador.ts';
import { crearClientePrisma } from './db/cliente.ts';
import { crearApp } from './app.ts';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { Hono } from 'hono';

/**
 * CORS no es un detalle cosmético en esta app: dentro del Electron empaquetado
 * el renderer y la API escuchan en **puertos efímeros distintos** (`port: 0`),
 * así que toda petición del frontend es cross-origin. Si el origen del
 * renderer no se permite, el navegador descarta cada respuesta y la app
 * instalada queda inservible — ni se puede dar de alta al primer
 * administrador. Como el puerto es aleatorio, esto no se puede cubrir con una
 * lista fija y es invisible en desarrollo (donde el puerto siempre es 3000).
 */
describe('CORS', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;

  /** El origen se refleja en la respuesta solo si está permitido. */
  async function origenPermitido(origin: string): Promise<boolean> {
    const respuesta = await app.request('/api/health', { headers: { Origin: origin } });
    return respuesta.headers.get('access-control-allow-origin') === origin;
  }

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cors-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    app = crearApp(prisma);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('acepta 127.0.0.1 en cualquier puerto (el renderer empaquetado usa uno efímero)', async () => {
    assert.ok(await origenPermitido('http://127.0.0.1:54321'));
    assert.ok(await origenPermitido('http://127.0.0.1:3000'));
  });

  test('acepta localhost y [::1] en cualquier puerto', async () => {
    assert.ok(await origenPermitido('http://localhost:3000'));
    assert.ok(await origenPermitido('http://localhost:61234'));
    assert.ok(await origenPermitido('http://[::1]:61234'));
  });

  test('rechaza orígenes remotos, incluidos los que imitan un host local', async () => {
    assert.ok(!(await origenPermitido('https://evil.com')));
    assert.ok(!(await origenPermitido('http://127.0.0.1.evil.com')));
    assert.ok(!(await origenPermitido('http://localhost.evil.com')));
    assert.ok(!(await origenPermitido('http://notlocalhost')));
    // Mismo host pero por HTTPS: el servidor local sirve HTTP plano.
    assert.ok(!(await origenPermitido('https://127.0.0.1:3000')));
  });
});
