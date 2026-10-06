import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { crearApp } from '../app.ts';
import { crearAdminConSesion } from '../test-helpers/auth.ts';
import { generarHash, crearSesion } from '../servicios/auth.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { Hono } from 'hono';

describe('Rutas de usuarios (CRM)', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let adminHeaders: Record<string, string>;
  let adminId: string;

  async function req(path: string, init: RequestInit = {}, headers = adminHeaders): Promise<Response> {
    return app.request(path, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
  }

  /** Crea un usuario normal con sesión, para probar el control de permisos. */
  async function crearUsuarioNormal(email: string) {
    const { salt, hash } = await generarHash('clave-de-prueba-123');
    const usuario = await prisma.usuario.create({
      data: { email, nombre: 'Normal', passwordHash: hash, salt, rol: 'usuario' },
    });
    const token = await crearSesion(prisma, usuario.id);
    return { usuario, headers: { Authorization: `Bearer ${token}` } };
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'usuarios-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    app = crearApp(prisma);
    ({ headers: adminHeaders, usuarioId: adminId } = await crearAdminConSesion(prisma));
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET / nunca expone passwordHash ni salt', async () => {
    const res = await req('/api/usuarios');
    assert.equal(res.status, 200);
    const usuarios: any = await res.json();
    assert.ok(usuarios.length >= 1);
    for (const u of usuarios) {
      assert.equal('passwordHash' in u, false, 'passwordHash no debe salir nunca de la API');
      assert.equal('salt' in u, false, 'salt no debe salir nunca de la API');
    }
  });

  test('POST / crea un usuario y su contraseña queda hasheada, no en claro', async () => {
    const res = await req('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nuevo@zacsolar.mx', nombre: 'Nuevo', password: 'clave-de-prueba-123', rol: 'usuario' }),
    });
    assert.equal(res.status, 201);

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { email: 'nuevo@zacsolar.mx' } });
    assert.notEqual(guardado.passwordHash, 'clave-de-prueba-123');
    assert.ok(guardado.passwordHash.length > 32);
  });

  test('un usuario sin rol admin no puede crear usuarios', async () => {
    const { headers } = await crearUsuarioNormal('normal1@zacsolar.mx');
    const res = await req(
      '/api/usuarios',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'x@zacsolar.mx', nombre: 'X', password: 'clave-de-prueba-123', rol: 'usuario' }),
      },
      headers
    );
    assert.equal(res.status, 403);
  });

  test('no se puede desactivar al último admin activo', async () => {
    // El admin de este archivo es el único con rol admin.
    const res = await req(`/api/usuarios/${adminId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    });
    assert.notEqual(res.status, 200, 'debe rechazarse: dejaría el sistema sin administradores');
    const sigue = await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } });
    assert.equal(sigue.activo, true, 'el admin debe seguir activo tras el intento');
  });

  test('no se puede borrar al último admin activo', async () => {
    const res = await req(`/api/usuarios/${adminId}`, { method: 'DELETE' });
    assert.notEqual(res.status, 204);
    const sigue = await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } });
    assert.equal(sigue.deletedAt, null);
  });

  test('con dos admins activos sí se puede degradar a uno', async () => {
    const { salt, hash } = await generarHash('clave-de-prueba-123');
    const segundo = await prisma.usuario.create({
      data: { email: 'admin2@zacsolar.mx', nombre: 'Admin 2', passwordHash: hash, salt, rol: 'admin' },
    });

    const res = await req(`/api/usuarios/${segundo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: 'usuario' }),
    });
    assert.equal(res.status, 200);

    const degradado = await prisma.usuario.findUniqueOrThrow({ where: { id: segundo.id } });
    assert.equal(degradado.rol, 'usuario');
  });

  test('sin sesión responde 401', async () => {
    const res = await app.request('/api/usuarios');
    assert.equal(res.status, 401);
  });
});
