import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { sembrarCatalogos } from '../db/seed.ts';
import { crearApp } from '../app.ts';
import { crearAdminConSesion } from '../test-helpers/auth.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { Hono } from 'hono';

describe('Rutas de funnel', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let authHeaders: Record<string, string>;
  let contactoId: string;

  async function req(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(path, {
      ...init,
      headers: { ...authHeaders, ...(init.headers as Record<string, string> | undefined) },
    });
  }

  /** Crea un proyecto directamente en la DB, en la fase indicada. */
  async function crearProyecto(codigo: string, faseId: string, ordenEnFase = 0) {
    return prisma.proyecto.create({
      data: { codigo, contactoId, nombre: `Proyecto ${codigo}`, faseId, ordenEnFase },
    });
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'funnel-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    app = crearApp(prisma);
    ({ headers: authHeaders } = await crearAdminConSesion(prisma));

    const contacto = await prisma.contacto.create({
      data: { codigo: 'CT-1', nombre: 'Contacto', apellidoPaterno: 'Prueba' },
    });
    contactoId = contacto.id;
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /fases devuelve las 5 fases de sistema sembradas por la migración', async () => {
    const res = await req('/api/funnel/fases');
    assert.equal(res.status, 200);
    const fases: any = await res.json();
    assert.deepEqual(
      fases.map((f: any) => f.slug),
      ['borrador', 'cotizado', 'enviado', 'vendido', 'perdido']
    );
    assert.equal(fases.every((f: any) => f.esSistema === true), true);
  });

  test('POST /fases crea una fase nueva al final del orden', async () => {
    const res = await req('/api/funnel/fases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Seguimiento', color: '#123456' }),
    });
    assert.equal(res.status, 201);
    const fase: any = await res.json();
    assert.equal(fase.nombre, 'Seguimiento');
    assert.equal(fase.esSistema, false);
    assert.equal(fase.orden, 5, 'debe quedar después de las 5 de sistema');
  });

  test('DELETE /fases/:id rechaza borrar una fase de sistema', async () => {
    const borrador = await prisma.funnelFase.findUniqueOrThrow({ where: { slug: 'borrador' } });
    const res = await req(`/api/funnel/fases/${borrador.id}`, { method: 'DELETE' });
    assert.equal(res.status, 403);
  });

  test('DELETE /fases/:id rechaza con 409 si la fase tiene proyectos', async () => {
    const creada: any = await (
      await req('/api/funnel/fases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Con proyectos', color: '#000000' }),
      })
    ).json();

    await crearProyecto('P-OCUPA', creada.id);

    const res = await req(`/api/funnel/fases/${creada.id}`, { method: 'DELETE' });
    assert.equal(res.status, 409, 'no se puede borrar una fase que todavía tiene proyectos');
  });

  test('DELETE /fases/:id borra una fase propia y vacía', async () => {
    const creada: any = await (
      await req('/api/funnel/fases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Desechable', color: '#abcdef' }),
      })
    ).json();

    const res = await req(`/api/funnel/fases/${creada.id}`, { method: 'DELETE' });
    assert.equal(res.status, 204);
  });

  test('PUT /proyectos/:id/mover recompacta el orden y no deja huecos ni empates', async () => {
    const cotizado = await prisma.funnelFase.findUniqueOrThrow({ where: { slug: 'cotizado' } });
    const enviado = await prisma.funnelFase.findUniqueOrThrow({ where: { slug: 'enviado' } });

    const a = await crearProyecto('MV-A', cotizado.id, 0);
    const b = await crearProyecto('MV-B', cotizado.id, 1);
    const cc = await crearProyecto('MV-C', cotizado.id, 2);

    // Mueve el del medio a la cabeza de la otra columna.
    const res = await req(`/api/funnel/proyectos/${b.id}/mover`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faseSlug: 'enviado', ordenEnFase: 0 }),
    });
    assert.equal(res.status, 200);

    const movido = await prisma.proyecto.findUniqueOrThrow({ where: { id: b.id } });
    assert.equal(movido.faseId, enviado.id);
    assert.equal(movido.ordenEnFase, 0);

    // La columna de origen queda compactada: 0 y 1, sin el hueco que dejó B.
    const origen = await prisma.proyecto.findMany({
      where: { faseId: cotizado.id },
      orderBy: { ordenEnFase: 'asc' },
      select: { id: true, ordenEnFase: true },
    });
    assert.deepEqual(
      origen.map((p) => p.ordenEnFase),
      [0, 1],
      'el orden de la columna de origen debe recompactarse'
    );
    assert.deepEqual(origen.map((p) => p.id), [a.id, cc.id]);
  });

  test('GET /tablero agrupa los proyectos por fase', async () => {
    const res = await req('/api/funnel/tablero');
    assert.equal(res.status, 200);
    const tablero: any = await res.json();
    assert.equal(Array.isArray(tablero), true);
    const enviado = tablero.find((f: any) => f.slug === 'enviado');
    assert.ok(enviado, 'la fase enviado debe venir en el tablero');
    assert.equal(enviado.proyectos.some((p: any) => p.codigo === 'MV-B'), true);
  });

  test('sin sesión responde 401', async () => {
    const res = await app.request('/api/funnel/fases');
    assert.equal(res.status, 401);
  });
});
