import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { crearApp } from '../app.ts';
import { generarHash, crearSesion, hashearToken } from '../servicios/auth.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { Hono } from 'hono';

const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

describe('rutas /api/auth', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let tokenAdmin: string;

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-auth-rutas-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    app = crearApp(prisma);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /api/auth/estado antes de crear usuarios responde hayUsuarios: false', async () => {
    const res = await app.request('/api/auth/estado');
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.hayUsuarios, false);
  });

  test('POST /api/auth/primer-admin crea admin aunque el payload intente otro rol', async () => {
    const res = await app.request('/api/auth/primer-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zacsolar.mx',
        nombre: 'Admin Principal',
        password: 'clave-admin-123',
        rol: 'usuario', // debe ser ignorado: el primer usuario siempre es admin
      }),
    });
    assert.equal(res.status, 201);
    const body: any = await res.json();
    assert.equal(body.rol, 'admin');
    assert.equal(body.email, 'admin@zacsolar.mx');
    assert.equal(body.passwordHash, undefined); // nunca se expone el hash
  });

  test('GET /api/auth/estado después de crear el primer usuario responde hayUsuarios: true', async () => {
    const res = await app.request('/api/auth/estado');
    const body: any = await res.json();
    assert.equal(body.hayUsuarios, true);
  });

  test('POST /api/auth/primer-admin responde 409 si ya existe un usuario', async () => {
    const res = await app.request('/api/auth/primer-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'otro@zacsolar.mx', nombre: 'Otro', password: 'clave-otro-123' }),
    });
    assert.equal(res.status, 409);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'YA_INICIALIZADO');
  });

  test('POST /api/auth/login con credenciales correctas devuelve token y datos del usuario', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zacsolar.mx', password: 'clave-admin-123' }),
    });
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.ok(body.token);
    assert.equal(body.usuario.email, 'admin@zacsolar.mx');
    assert.equal(body.usuario.rol, 'admin');
    assert.equal(body.usuario.passwordHash, undefined);
    tokenAdmin = body.token;
  });

  test('POST /api/auth/login con contraseña incorrecta responde 401 genérico', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zacsolar.mx', password: 'clave-equivocada' }),
    });
    assert.equal(res.status, 401);
    const body: any = await res.json();
    assert.equal(body.error.mensaje, MENSAJE_CREDENCIALES_INVALIDAS);
  });

  test('POST /api/auth/login con email inexistente responde el mismo 401 genérico', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-existe@zacsolar.mx', password: 'cualquier-cosa' }),
    });
    assert.equal(res.status, 401);
    const body: any = await res.json();
    assert.equal(body.error.mensaje, MENSAJE_CREDENCIALES_INVALIDAS);
  });

  test('POST /api/auth/login con cuenta inactiva responde el mismo 401 genérico', async () => {
    const { salt, hash } = await generarHash('clave-inactivo-123');
    await prisma.usuario.create({
      data: { email: 'inactivo@zacsolar.mx', nombre: 'Inactivo', passwordHash: hash, salt, rol: 'usuario', activo: false },
    });

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inactivo@zacsolar.mx', password: 'clave-inactivo-123' }),
    });
    assert.equal(res.status, 401);
    const body: any = await res.json();
    assert.equal(body.error.mensaje, MENSAJE_CREDENCIALES_INVALIDAS);
  });

  test('ruta protegida sin token responde 401', async () => {
    const res = await app.request('/api/auth/yo');
    assert.equal(res.status, 401);
    const body: any = await res.json();
    assert.ok(body.error.codigo);
  });

  test('ruta protegida con token válido responde 200', async () => {
    const res = await app.request('/api/auth/yo', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.email, 'admin@zacsolar.mx');
    assert.equal(body.passwordHash, undefined);
  });

  test('ruta protegida con token inválido responde 401', async () => {
    const res = await app.request('/api/auth/yo', { headers: { Authorization: 'Bearer token-que-no-existe' } });
    assert.equal(res.status, 401);
  });

  test('sesión expirada responde 401 (y se borra de la DB)', async () => {
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@zacsolar.mx' } });
    assert.ok(admin);
    const token = await crearSesion(prisma, admin!.id);
    await prisma.sesion.update({
      where: { tokenHash: hashearToken(token) },
      data: { expiraEn: new Date(Date.now() - 1000) },
    });

    const res = await app.request('/api/auth/yo', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 401);

    const sesionEnDb = await prisma.sesion.findUnique({ where: { tokenHash: hashearToken(token) } });
    assert.equal(sesionEnDb, null);
  });

  test('PATCH /api/auth/yo actualiza nombre propio', async () => {
    const res = await app.request('/api/auth/yo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ nombre: 'Admin Renombrado' }),
    });
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.nombre, 'Admin Renombrado');
  });

  test('POST /api/auth/yo/password con contraseña actual incorrecta responde 401', async () => {
    const res = await app.request('/api/auth/yo/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ passwordActual: 'clave-que-no-es', passwordNueva: 'nueva-clave-12345678' }),
    });
    assert.equal(res.status, 401);
  });

  test('cambiar la contraseña invalida las otras sesiones pero conserva la actual', async () => {
    // Dos logins = dos sesiones válidas para el mismo usuario.
    const loginA = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zacsolar.mx', password: 'clave-admin-123' }),
    });
    const { token: tokenA }: any = await loginA.json();

    const loginB = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zacsolar.mx', password: 'clave-admin-123' }),
    });
    const { token: tokenB }: any = await loginB.json();

    const cambio = await app.request('/api/auth/yo/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ passwordActual: 'clave-admin-123', passwordNueva: 'clave-admin-nueva-456' }),
    });
    assert.equal(cambio.status, 204);

    // La sesión que hizo el cambio (tokenA) sigue viva.
    const conTokenA = await app.request('/api/auth/yo', { headers: { Authorization: `Bearer ${tokenA}` } });
    assert.equal(conTokenA.status, 200);

    // La otra sesión (tokenB) quedó invalidada.
    const conTokenB = await app.request('/api/auth/yo', { headers: { Authorization: `Bearer ${tokenB}` } });
    assert.equal(conTokenB.status, 401);
  });

  test('POST /api/auth/logout borra la sesión del token usado', async () => {
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zacsolar.mx', password: 'clave-admin-nueva-456' }),
    });
    const { token }: any = await login.json();

    const logout = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 204);

    const res = await app.request('/api/auth/yo', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 401);
  });

  test('el hash guardado en la base de datos no es la contraseña en claro', async () => {
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@zacsolar.mx' } });
    assert.ok(admin);
    assert.notEqual(admin!.passwordHash, 'clave-admin-nueva-456');
    assert.ok(admin!.passwordHash.length > 0);
  });
});
