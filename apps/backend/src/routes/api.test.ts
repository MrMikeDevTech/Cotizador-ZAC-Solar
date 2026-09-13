import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { sembrarCatalogos } from '../db/seed.ts';
import { crearApp } from '../app.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import type { Hono } from 'hono';

const consumosFixture = [
  { inicioStr: 'marzo 2026', terminoStr: 'mayo 2026', kwh: '786', pago: '2110.43' },
  { inicioStr: 'enero 2026', terminoStr: 'marzo 2026', kwh: '582', pago: '1572.20' },
  { inicioStr: 'noviembre 2025', terminoStr: 'enero 2026', kwh: '668', pago: '1955.10' },
  { inicioStr: 'septiembre 2025', terminoStr: 'noviembre 2025', kwh: '896', pago: '2972.96' },
  { inicioStr: 'julio 2025', terminoStr: 'septiembre 2025', kwh: '975', pago: '2903.51' },
  { inicioStr: 'mayo 2025', terminoStr: 'julio 2025', kwh: '861', pago: '2373.56' },
];

const conceptosFixture = [
  { id: '1', concepto: 'Precio de paneles', costoBase: 30800, margenPorcentaje: 0 },
  { id: '2', concepto: 'Precio de inversores', costoBase: 13500, margenPorcentaje: 0 },
  { id: '3', concepto: 'Precio material eléctrico', costoBase: 8120, margenPorcentaje: 0 },
  { id: '4', concepto: 'Mano de obra', costoBase: 8400, margenPorcentaje: 0 },
];

function payloadProyecto(overrides: Record<string, unknown> = {}) {
  return {
    datosContacto: {
      nombre: 'YARELI', apellidoPaterno: 'RAMIREZ', apellidoMaterno: 'SANTIAGO',
      telefono: '3271128421', celular: '3271128421', email: 'correo@ejemplo.com',
      estado: 'Nayarit', localidad: 'Compostela', fuenteContacto: 'Conocido',
      estatus: 'Cotización entregada', notas: '', mostrarEmpresariales: false,
      empresariales: { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' },
    },
    datosProyecto: {
      nombreProyecto: 'YARELI RAMIREZ SANTIAGO', localidadConsumo: 'Nayarit - Compostela',
      hilos: '1 hilo', nombreRecibo: 'RAMIREZ SANTIAGO YARELI', numeroServicio: '495150300176',
      ivaCFE: 16, porcentajeDap: '', usarNuevaTarifa: false, tarifaSeleccionada: '1B',
      aplicarDac: false, aplicarDap: false, fechaInicio: '2026-05-15', periodo: 'Bimestral',
      consumos: consumosFixture,
    },
    equipo: { panelClave: 'jinko_615', cantPaneles: 7, inversorClave: 'growatt_mic_3300', cantInversores: 1 },
    otrosCargos: {
      estructuraId: null, metodoPrecio: 'unitario', incluirIva: false, tipoMoneda: 'MXN', valorDolar: 16.9,
      ocultarDesglose: false, descuento5: false, descuento10: false, cargosEditables: [],
      conceptos: conceptosFixture,
    },
    estatus: 'cotizado', pasoActual: 5,
    ...overrides,
  };
}

describe('API Hono (contactos, proyectos, cotización, config)', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-api-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    app = crearApp(prisma);
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /api/health responde ok', async () => {
    const res = await app.request('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { estado: 'ok' });
  });

  test('GET /api/config devuelve los catálogos sembrados', async () => {
    const res = await app.request('/api/config');
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.equal(data.paneles.length, 6);
    assert.equal(data.inversores.length, 14);
    assert.equal(data.empresa.nombre, 'Energy Sun');
    assert.deepEqual(data.factores.factoresEstacionales, [1.10, 0.97, 0.88, 1.00, 0.89, 1.10]);
  });

  test('POST /api/contactos crea un contacto y GET /api/contactos?q= lo encuentra', async () => {
    const res = await app.request('/api/contactos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Juan', apellidoPaterno: 'Perez', apellidoMaterno: '', telefono: '', celular: '',
        email: '', estado: 'Jalisco', localidad: 'Guadalajara', fuenteContacto: 'Facebook',
        estatus: 'Primer contacto', notas: '', mostrarEmpresariales: false,
        empresariales: { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' },
      }),
    });
    assert.equal(res.status, 201);
    const contacto: any = await res.json();
    assert.ok(contacto.id);
    assert.equal(contacto.codigo.startsWith('JUP-'), true);

    const busqueda = await app.request('/api/contactos?q=Juan');
    const resultados: any = await busqueda.json();
    assert.equal(resultados.some((c: any) => c.id === contacto.id), true);
  });

  test('POST /api/proyectos guarda contacto + proyecto + 6 consumos + cotización en una transacción', async () => {
    const res = await app.request('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadProyecto()),
    });
    assert.equal(res.status, 201);
    const proyecto: any = await res.json();

    assert.equal(proyecto.consumos.length, 6);
    assert.equal(proyecto.cotizaciones.length, 1);
    assert.equal(proyecto.cotizaciones[0].granTotal, 60820); // sin estructura: 30800+13500+8120+8400
    assert.equal(proyecto.cotizaciones[0].cantPaneles, 7);
    assert.equal(proyecto.contacto.nombre, 'YARELI');
  });

  test('GET /api/proyectos/:id rehidrata el proyecto completo', async () => {
    const creado: any = await (
      await app.request('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ estatus: 'borrador', pasoActual: 3 })),
      })
    ).json();

    const res = await app.request(`/api/proyectos/${creado.id}`);
    assert.equal(res.status, 200);
    const proyecto: any = await res.json();
    assert.equal(proyecto.estatus, 'borrador');
    assert.equal(proyecto.pasoActual, 3);
    assert.equal(proyecto.consumos.length, 6);
  });

  test('PUT /api/proyectos/:id actualiza un borrador y crea una nueva versión de cotización', async () => {
    const creado: any = await (
      await app.request('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ estatus: 'borrador' })),
      })
    ).json();

    const actualizado: any = await (
      await app.request(`/api/proyectos/${creado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ estatus: 'cotizado', equipo: { panelClave: 'jinko_615', cantPaneles: 10, inversorClave: 'growatt_mic_3300', cantInversores: 1 } })),
      })
    ).json();

    assert.equal(actualizado.estatus, 'cotizado');
    assert.equal(actualizado.cotizaciones[0].version, 2);
    assert.equal(actualizado.cotizaciones[0].cantPaneles, 10);
    // sigue habiendo exactamente 6 consumos (reemplazados, no acumulados)
    assert.equal(actualizado.consumos.length, 6);
  });

  test('GET /api/proyectos/:id con id inexistente responde 404 con forma de error consistente', async () => {
    const res = await app.request('/api/proyectos/no-existe');
    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'NO_ENCONTRADO');
  });

  test('POST /api/cotizacion/calcular no persiste nada y da el mismo resultado que guardar', async () => {
    const payload = payloadProyecto();
    const res = await app.request('/api/cotizacion/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consumos: payload.datosProyecto.consumos,
        periodo: payload.datosProyecto.periodo,
        equipo: payload.equipo,
        otrosCargos: payload.otrosCargos,
      }),
    });
    assert.equal(res.status, 200);
    const calculo: any = await res.json();
    assert.equal(calculo.granTotal, 60820);

    const totalProyectosAntes = await prisma.proyecto.count();
    // no debe haber creado ningún proyecto nuevo
    assert.equal(await prisma.proyecto.count(), totalProyectosAntes);
  });

  test('POST /api/proyectos con datos inválidos responde 400 con detalle de validación', async () => {
    const res = await app.request('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datosContacto: {} }),
    });
    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'VALIDACION');
  });
});
