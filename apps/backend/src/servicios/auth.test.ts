import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import {
  generarHash,
  verificarPassword,
  crearSesion,
  validarSesion,
  contarAdminsActivos,
  desactivarUsuario,
  borrarUsuario,
  cambiarRolUsuario,
  aUsuarioSesion,
} from './auth.ts';
import { ErrorApi } from '../errores.ts';

/** Desactiva cualquier otro admin activo que haya quedado de tests previos, para que `idAMantener` sea realmente el único admin activo del sistema. */
async function aislarComoUnicoAdminActivo(prisma: PrismaClient, idAMantener: string): Promise<void> {
  await prisma.usuario.updateMany({
    where: { rol: 'admin', activo: true, deletedAt: null, id: { not: idAMantener } },
    data: { activo: false },
  });
}

async function crearUsuario(
  prisma: PrismaClient,
  datos: { email: string; nombre?: string; rol?: string; password?: string; activo?: boolean }
) {
  const { salt, hash } = await generarHash(datos.password ?? 'clave-de-prueba-123');
  return prisma.usuario.create({
    data: {
      email: datos.email,
      nombre: datos.nombre ?? 'Usuario de prueba',
      passwordHash: hash,
      salt,
      rol: datos.rol ?? 'usuario',
      activo: datos.activo ?? true,
    },
  });
}

describe('servicios/auth', () => {
  let dbPath: string;
  let prisma: PrismaClient;

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-auth-servicio-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('generarHash nunca guarda la contraseña en claro', async () => {
    const { hash, salt } = await generarHash('mi-contraseña-secreta');
    assert.notEqual(hash, 'mi-contraseña-secreta');
    assert.ok(/^[0-9a-f]+$/.test(hash));
    assert.ok(/^[0-9a-f]+$/.test(salt));
  });

  test('verificarPassword acepta la contraseña correcta y rechaza una incorrecta', async () => {
    const { hash, salt } = await generarHash('clave-correcta-123');
    assert.equal(await verificarPassword('clave-correcta-123', salt, hash), true);
    assert.equal(await verificarPassword('clave-incorrecta', salt, hash), false);
  });

  test('crearSesion + validarSesion: un token recién creado valida contra el usuario correcto', async () => {
    const usuario = await crearUsuario(prisma, { email: 'sesion1@test.mx' });
    const token = await crearSesion(prisma, usuario.id);

    const resultado = await validarSesion(prisma, token);
    assert.ok(resultado);
    assert.equal(resultado?.id, usuario.id);
  });

  test('validarSesion rechaza una sesión expirada y la borra', async () => {
    const usuario = await crearUsuario(prisma, { email: 'sesion-expirada@test.mx' });
    const token = await crearSesion(prisma, usuario.id);

    // Forzamos la expiración manipulando directamente la fila (expiraEn en el pasado).
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.sesion.update({ where: { tokenHash }, data: { expiraEn: new Date(Date.now() - 1000) } });

    const resultado = await validarSesion(prisma, token);
    assert.equal(resultado, null);

    const sesionEnDb = await prisma.sesion.findUnique({ where: { tokenHash } });
    assert.equal(sesionEnDb, null);
  });

  test('contarAdminsActivos ignora admins inactivos y borrados', async () => {
    await crearUsuario(prisma, { email: 'admin-activo-1@test.mx', rol: 'admin' });
    await crearUsuario(prisma, { email: 'admin-inactivo@test.mx', rol: 'admin', activo: false });
    const admins = await contarAdminsActivos(prisma);
    assert.ok(admins >= 1);
  });

  test('no se puede desactivar al último admin activo', async () => {
    const admin = await crearUsuario(prisma, { email: 'ultimo-admin-desactivar@test.mx', rol: 'admin' });
    const otro = await crearUsuario(prisma, { email: 'otro-usuario-desactivar@test.mx', rol: 'usuario' });
    await aislarComoUnicoAdminActivo(prisma, admin.id);

    await assert.rejects(
      () => desactivarUsuario(prisma, admin.id, otro.id),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'ULTIMO_ADMIN'
    );

    const admins = await contarAdminsActivos(prisma);
    assert.ok(admins >= 1);
  });

  test('no se puede borrar al último admin activo', async () => {
    const admin = await crearUsuario(prisma, { email: 'ultimo-admin-borrar@test.mx', rol: 'admin' });
    const otro = await crearUsuario(prisma, { email: 'otro-usuario-borrar@test.mx', rol: 'usuario' });
    await aislarComoUnicoAdminActivo(prisma, admin.id);

    await assert.rejects(
      () => borrarUsuario(prisma, admin.id, otro.id),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'ULTIMO_ADMIN'
    );

    const sigueActivo = await prisma.usuario.findUnique({ where: { id: admin.id } });
    assert.equal(sigueActivo?.deletedAt, null);
  });

  test('no se puede degradar a "usuario" al último admin activo', async () => {
    const admin = await crearUsuario(prisma, { email: 'ultimo-admin-degradar@test.mx', rol: 'admin' });
    await aislarComoUnicoAdminActivo(prisma, admin.id);

    await assert.rejects(
      () => cambiarRolUsuario(prisma, admin.id, 'usuario', aUsuarioSesion({ ...admin })),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'ULTIMO_ADMIN'
    );
  });

  test('con dos admins activos, sí se puede degradar a uno de ellos', async () => {
    const admin1 = await crearUsuario(prisma, { email: 'admin-degradable-1@test.mx', rol: 'admin' });
    const admin2 = await crearUsuario(prisma, { email: 'admin-degradable-2@test.mx', rol: 'admin' });

    const resultado = await cambiarRolUsuario(prisma, admin1.id, 'usuario', aUsuarioSesion({ ...admin2 }));
    assert.equal(resultado.rol, 'usuario');

    const admins = await contarAdminsActivos(prisma);
    assert.ok(admins >= 1);
  });

  test('un usuario no puede desactivarse a sí mismo', async () => {
    const usuario = await crearUsuario(prisma, { email: 'auto-desactivar@test.mx', rol: 'usuario' });
    await assert.rejects(
      () => desactivarUsuario(prisma, usuario.id, usuario.id),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'AUTOACCION_NO_PERMITIDA'
    );
  });

  test('un usuario no puede borrarse a sí mismo', async () => {
    const usuario = await crearUsuario(prisma, { email: 'auto-borrar@test.mx', rol: 'usuario' });
    await assert.rejects(
      () => borrarUsuario(prisma, usuario.id, usuario.id),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'AUTOACCION_NO_PERMITIDA'
    );
  });

  test('solo un admin puede asignar el rol admin a otro usuario', async () => {
    const solicitanteNoAdmin = await crearUsuario(prisma, { email: 'no-admin-asigna@test.mx', rol: 'usuario' });
    const objetivo = await crearUsuario(prisma, { email: 'objetivo-asciende@test.mx', rol: 'usuario' });

    await assert.rejects(
      () => cambiarRolUsuario(prisma, objetivo.id, 'admin', aUsuarioSesion({ ...solicitanteNoAdmin })),
      (err: unknown) => err instanceof ErrorApi && err.codigo === 'PERMISO_DENEGADO'
    );
  });
});
