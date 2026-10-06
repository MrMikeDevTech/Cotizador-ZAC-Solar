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

describe('Rutas de agenda, reportes, historial de cotizaciones y tarifas aplicables', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let authHeaders: Record<string, string>;
  let proyectoId: string;
  let localidadId: string;

  async function req(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(path, {
      ...init,
      headers: { ...authHeaders, ...(init.headers as Record<string, string> | undefined) },
    });
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agenda-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    app = crearApp(prisma);
    ({ headers: authHeaders } = await crearAdminConSesion(prisma));

    const contacto = await prisma.contacto.create({ data: { codigo: 'CT-A', nombre: 'Ana' } });
    const fase = await prisma.funnelFase.findUniqueOrThrow({ where: { slug: 'cotizado' } });
    const proyecto = await prisma.proyecto.create({
      data: { codigo: 'PR-A', contactoId: contacto.id, nombre: 'Proyecto Ana', faseId: fase.id },
    });
    proyectoId = proyecto.id;

    // Un dato de cada tipo dentro de la ventana que se consulta abajo.
    await prisma.eventoAgenda.create({
      data: { titulo: 'Visita técnica', inicio: new Date('2026-06-10T10:00:00.000Z'), tipo: 'visita', proyectoId },
    });
    await prisma.tarea.create({
      data: { titulo: 'Llamar al cliente', proyectoId, fechaVencimiento: new Date('2026-06-15T10:00:00.000Z') },
    });

    const localidad = await prisma.localidad.findFirstOrThrow();
    localidadId = localidad.id;
    await prisma.localidad.update({
      where: { id: localidadId },
      data: { mesInicioVerano: 5, regionDac: 'Central' },
    });
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /api/agenda devuelve eventos y tareas juntos, ordenados por fecha', async () => {
    const res = await req('/api/agenda?desde=2026-06-01T00:00:00.000Z&hasta=2026-06-30T00:00:00.000Z');
    assert.equal(res.status, 200);
    const items: any = await res.json();

    const tipos = new Set(items.map((i: any) => i.tipo));
    assert.equal(tipos.has('evento'), true, 'debe incluir eventos de agenda');
    assert.equal(tipos.has('tarea'), true, 'debe incluir tareas con vencimiento, no solo eventos');

    const fechas = items.map((i: any) => i.inicio);
    assert.deepEqual(fechas, [...fechas].sort(), 'la lista unificada debe venir ordenada por fecha');
  });

  test('GET /api/agenda excluye lo que cae fuera del rango', async () => {
    const res = await req('/api/agenda?desde=2026-01-01T00:00:00.000Z&hasta=2026-01-31T00:00:00.000Z');
    const items: any = await res.json();
    assert.equal(items.some((i: any) => i.titulo === 'Visita técnica'), false);
  });

  test('POST /api/agenda crea un evento y aparece en la consulta', async () => {
    const res = await req('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Instalación', inicio: '2026-06-20T09:00:00.000Z', tipo: 'instalacion' }),
    });
    assert.equal(res.status, 201);

    const lista: any = await (
      await req('/api/agenda?desde=2026-06-01T00:00:00.000Z&hasta=2026-06-30T00:00:00.000Z')
    ).json();
    assert.equal(lista.some((i: any) => i.titulo === 'Instalación'), true);
  });

  test('GET /api/reportes/resumen agrega proyectos por fase con datos reales', async () => {
    const res = await req('/api/reportes/resumen');
    assert.equal(res.status, 200);
    const resumen: any = await res.json();
    const cotizado = resumen.proyectosPorFase.find((f: any) => f.slug === 'cotizado');
    assert.ok(cotizado, 'debe venir la fase cotizado');
    assert.equal(cotizado.total, 1, 'hay exactamente un proyecto en esa fase');
  });

  test('GET /api/reportes/actividad pagina correctamente', async () => {
    const res = await req('/api/reportes/actividad?pagina=1&porPagina=1');
    assert.equal(res.status, 200);
    const actividad: any = await res.json();
    assert.equal(actividad.pagina, 1);
    assert.equal(actividad.datos.length <= 1, true);
    assert.equal(actividad.total >= 2, true, 'hay al menos un proyecto y un contacto');
  });

  test('GET /api/cotizacion/proyecto/:id responde 404 si el proyecto no tiene cotizaciones', async () => {
    const res = await req(`/api/cotizacion/proyecto/${proyectoId}`);
    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'NO_ENCONTRADO');
  });

  test('GET /api/cfe-rates/aplicables resuelve la temporada por el mesInicioVerano de la localidad', async () => {
    // Con el verano arrancando en mayo, mayo-octubre son verano y el resto no.
    const periodos = encodeURIComponent(JSON.stringify([{ year: 2026, month: 7 }, { year: 2026, month: 1 }]));
    const res = await req(`/api/cfe-rates/aplicables?tarifa=1A&localidadId=${localidadId}&periodos=${periodos}`);
    assert.equal(res.status, 200);

    const datos: any = await res.json();
    assert.equal(datos.mesInicioVerano, 5);
    assert.equal(datos.periodos[0].season, 'summer', 'julio cae en verano');
    assert.equal(datos.periodos[1].season, 'non_summer', 'enero cae fuera de verano');
  });

  test('GET /api/cfe-rates/aplicables sin cuotas responde 200 con completo:false, no un error', async () => {
    const periodos = encodeURIComponent(JSON.stringify([{ year: 2026, month: 7 }]));
    const res = await req(`/api/cfe-rates/aplicables?tarifa=1A&localidadId=${localidadId}&periodos=${periodos}`);
    assert.equal(res.status, 200, 'la falta de datos no es un error: el frontend avisa de cálculo aproximado');
    const datos: any = await res.json();
    assert.equal(datos.completo, false);
    assert.equal(datos.periodos[0].disponible, false);
  });

  test('GET /api/cfe-rates/aplicables con cuotas cargadas marca completo:true', async () => {
    await prisma.cfeTariffRate.createMany({
      data: [
        { tariffCode: '1A', year: 2026, month: 7, season: 'summer', tierIndex: 0, concept: 'Consumo básico', price: 1.019, description: 'primeros 100', limitKwh: 100 },
        { tariffCode: '1A', year: 2026, month: 7, season: 'summer', tierIndex: 1, concept: 'Consumo excedente', price: 4.054, description: 'adicional', limitKwh: null },
      ],
    });

    const periodos = encodeURIComponent(JSON.stringify([{ year: 2026, month: 7 }]));
    const res = await req(`/api/cfe-rates/aplicables?tarifa=1A&localidadId=${localidadId}&periodos=${periodos}`);
    const datos: any = await res.json();

    assert.equal(datos.completo, true);
    assert.equal(datos.periodos[0].escalones.length, 2);
    assert.equal(datos.periodos[0].escalones[0].tierIndex, 0, 'los escalones vienen ordenados');
  });

  test('GET /api/cfe-rates/aplicables con tarifa DAC usa la región de la localidad', async () => {
    await prisma.cfeDacRate.create({
      data: { year: 2026, month: 7, region: 'Central', cargoFijo: 142.25, precioKwh: 6.529, precioKwhVerano: null },
    });

    const periodos = encodeURIComponent(JSON.stringify([{ year: 2026, month: 7 }]));
    const res = await req(`/api/cfe-rates/aplicables?tarifa=DAC&localidadId=${localidadId}&periodos=${periodos}`);
    assert.equal(res.status, 200);

    const datos: any = await res.json();
    assert.equal(datos.completo, true);
    assert.equal(datos.periodos[0].region, 'Central');
    assert.equal(datos.periodos[0].dac.cargoFijo, 142.25);
    assert.equal(datos.periodos[0].dac.precioKwh, 6.529);
  });

  test('GET /api/cfe-rates/aplicables con periodos mal formados responde 400', async () => {
    const res = await req(`/api/cfe-rates/aplicables?tarifa=1A&localidadId=${localidadId}&periodos=no-es-json`);
    assert.equal(res.status, 400);
  });
});
