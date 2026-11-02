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

  test('el correo se guarda en minúsculas y sin espacios, y no admite duplicados por mayúsculas', async () => {
    const crear = (email: string) =>
      req('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre: 'Mayus', password: 'clave-de-prueba-123' }),
      });
    const res = await crear('  Mayus@ZacSolar.MX ');
    assert.equal(res.status, 201);
    assert.equal(((await res.json()) as any).email, 'mayus@zacsolar.mx');
    assert.equal((await crear('MAYUS@zacsolar.mx')).status, 409);

    // Y el login funciona con cualquier capitalización.
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' MAYUS@ZACSOLAR.MX', password: 'clave-de-prueba-123' }),
    });
    assert.equal(login.status, 200);
  });

  test('POST /:id/password: el admin cambia la clave de otro, que cierra sus sesiones', async () => {
    const { usuario, headers } = await crearUsuarioNormal('olvidadizo@zacsolar.mx');
    const cambiar = (id: string, passwordNueva: string, h = adminHeaders) =>
      req(
        `/api/usuarios/${id}/password`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passwordNueva }) },
        h
      );

    assert.equal((await cambiar(usuario.id, 'corta')).status, 400);
    assert.equal((await cambiar(usuario.id, 'clave-nueva-456')).status, 204);

    // La sesión vieja del usuario ya no sirve y la clave nueva sí inicia sesión.
    assert.equal((await req('/api/auth/yo', {}, headers)).status, 401);
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'olvidadizo@zacsolar.mx', password: 'clave-nueva-456' }),
    });
    assert.equal(login.status, 200);

    // Un usuario normal no puede, ni siquiera sobre sí mismo; un id inexistente da 404.
    const { usuario: otro, headers: hOtro } = await crearUsuarioNormal('sin-permiso@zacsolar.mx');
    assert.equal((await cambiar(otro.id, 'clave-nueva-456', hOtro)).status, 403);
    assert.equal((await cambiar('no-existe', 'clave-nueva-456')).status, 404);
  });

  test('POST /:id/password sobre sí mismo conserva la sesión actual del admin', async () => {
    const res = await req(`/api/usuarios/${adminId}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordNueva: 'otra-clave-admin-789' }),
    });
    assert.equal(res.status, 204);
    assert.equal((await req('/api/auth/yo')).status, 200);
  });

  test('POST / sin contraseña crea el usuario con una aleatoria (alta rápida)', async () => {
    const res = await req('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sin-clave@zacsolar.mx', nombre: 'Sin Clave' }),
    });
    assert.equal(res.status, 201);
    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { email: 'sin-clave@zacsolar.mx' } });
    assert.ok(guardado.passwordHash.length > 32);
    assert.equal(guardado.rol, 'usuario');
  });

  describe('cambio rápido de cuenta', () => {
    const json = { 'Content-Type': 'application/json' };

    test('cambia a otro vendedor sin contraseña: token nuevo y el anterior queda cerrado', async () => {
      const { usuario: destino } = await crearUsuarioNormal('destino-rapido@zacsolar.mx');
      const { headers: origen } = await crearUsuarioNormal('origen-rapido@zacsolar.mx');

      const res = await req(
        '/api/auth/cambio-rapido',
        { method: 'POST', headers: json, body: JSON.stringify({ usuarioId: destino.id }) },
        origen
      );
      assert.equal(res.status, 200);
      const cuerpo: any = await res.json();
      assert.equal(cuerpo.usuario.id, destino.id);
      assert.equal('passwordHash' in cuerpo.usuario, false);

      const yo: any = await (await req('/api/auth/yo', {}, { Authorization: `Bearer ${cuerpo.token}` })).json();
      assert.equal(yo.id, destino.id);
      assert.equal((await req('/api/auth/yo', {}, origen)).status, 401);
    });

    test('rechaza usuarios inexistentes, inactivos o borrados, y exige sesión', async () => {
      const { usuario: inactivo } = await crearUsuarioNormal('inactivo-rapido@zacsolar.mx');
      await prisma.usuario.update({ where: { id: inactivo.id }, data: { activo: false } });
      const { usuario: borrado } = await crearUsuarioNormal('borrado-rapido@zacsolar.mx');
      await prisma.usuario.update({ where: { id: borrado.id }, data: { deletedAt: new Date() } });

      for (const usuarioId of [inactivo.id, borrado.id, 'no-existe']) {
        const res = await req('/api/auth/cambio-rapido', {
          method: 'POST',
          headers: json,
          body: JSON.stringify({ usuarioId }),
        });
        assert.equal(res.status, 404, usuarioId);
      }

      const sinSesion = await app.request('/api/auth/cambio-rapido', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ usuarioId: adminId }),
      });
      assert.equal(sinSesion.status, 401);
    });

    test('GET /vendedores lista solo activos, sin datos sensibles, también para un usuario normal', async () => {
      const { headers } = await crearUsuarioNormal('lista-rapida@zacsolar.mx');
      const res = await req('/api/auth/vendedores', {}, headers);
      assert.equal(res.status, 200);
      const lista: any[] = (await res.json()) as any[];
      assert.ok(lista.some((u) => u.email === 'lista-rapida@zacsolar.mx'));
      assert.ok(!lista.some((u) => u.email === 'inactivo-rapido@zacsolar.mx'));
      for (const u of lista) assert.deepEqual(Object.keys(u).sort(), ['email', 'id', 'nombre', 'rol']);
    });

    test('POST /vendedores crea un usuario normal, entra como él y rechaza correos repetidos', async () => {
      const { headers } = await crearUsuarioNormal('quien-agrega@zacsolar.mx');
      const { headers: otraSesion } = await crearUsuarioNormal('quien-agrega-2@zacsolar.mx');
      const crear = (email: string, h = headers) =>
        req(
          '/api/auth/vendedores',
          { method: 'POST', headers: json, body: JSON.stringify({ nombre: 'Vendedor Nuevo', email }) },
          h
        );

      const res = await crear(' Nuevo.Vendedor@ZacSolar.mx ');
      assert.equal(res.status, 201);
      const cuerpo: any = await res.json();
      assert.equal(cuerpo.usuario.email, 'nuevo.vendedor@zacsolar.mx');
      assert.equal(cuerpo.usuario.rol, 'usuario');

      const yo: any = await (await req('/api/auth/yo', {}, { Authorization: `Bearer ${cuerpo.token}` })).json();
      assert.equal(yo.email, 'nuevo.vendedor@zacsolar.mx');
      // La alta cerró la sesión de quien la hizo, como un cambio de cuenta.
      assert.equal((await req('/api/auth/yo', {}, headers)).status, 401);
      assert.equal((await crear('nuevo.vendedor@zacsolar.mx', otraSesion)).status, 409);
    });
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
