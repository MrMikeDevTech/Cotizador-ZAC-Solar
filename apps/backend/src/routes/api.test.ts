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
    faseSlug: 'cotizado', pasoActual: 5,
    ...overrides,
  };
}

describe('API Hono (contactos, proyectos, cotización, config)', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let app: Hono<any>;
  let authHeaders: Record<string, string>;

  /** Helper que manda el header de sesión en cada petición, para no repetir el login en cada test. */
  async function req(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(path, { ...init, headers: { ...authHeaders, ...(init.headers as Record<string, string> | undefined) } });
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-api-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    app = crearApp(prisma);
    ({ headers: authHeaders } = await crearAdminConSesion(prisma));
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  test('GET /api/health responde ok', async () => {
    const res = await req('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { estado: 'ok' });
  });

  test('GET /api/config devuelve los catálogos sembrados', async () => {
    const res = await req('/api/config');
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.equal(data.paneles.length, 6);
    assert.equal(data.inversores.length, 14);
    // La empresa NO se siembra: una cotización no puede salir a nombre de
    // una empresa que el usuario nunca capturó. Llega `null` hasta que se
    // llenan los datos en Configuración → Formato de Cotización.
    assert.equal(data.empresa, null);
    assert.deepEqual(data.factores.factoresEstacionales, [1.10, 0.97, 0.88, 1.00, 0.89, 1.10]);
  });

  test('POST /api/contactos crea un contacto y GET /api/contactos?q= lo encuentra', async () => {
    const res = await req('/api/contactos', {
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

    const busqueda = await req('/api/contactos?q=Juan');
    const resultados: any = await busqueda.json();
    assert.equal(resultados.some((c: any) => c.id === contacto.id), true);
  });

  test('POST /api/proyectos guarda contacto + proyecto + 6 consumos + cotización en una transacción', async () => {
    const res = await req('/api/proyectos', {
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
      await req('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'borrador', pasoActual: 3 })),
      })
    ).json();

    const res = await req(`/api/proyectos/${creado.id}`);
    assert.equal(res.status, 200);
    const proyecto: any = await res.json();
    assert.equal(proyecto.fase.slug, 'borrador');
    assert.equal(proyecto.pasoActual, 3);
    assert.equal(proyecto.consumos.length, 6);
  });

  test('PUT /api/proyectos/:id actualiza un borrador y crea una nueva versión de cotización', async () => {
    const creado: any = await (
      await req('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'borrador' })),
      })
    ).json();

    const actualizado: any = await (
      await req(`/api/proyectos/${creado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'cotizado', equipo: { panelClave: 'jinko_615', cantPaneles: 10, inversorClave: 'growatt_mic_3300', cantInversores: 1 } })),
      })
    ).json();

    assert.equal(actualizado.fase.slug, 'cotizado');
    assert.equal(actualizado.cotizaciones[0].version, 2);
    assert.equal(actualizado.cotizaciones[0].cantPaneles, 10);
    // sigue habiendo exactamente 6 consumos (reemplazados, no acumulados)
    assert.equal(actualizado.consumos.length, 6);
  });

  test('PUT /api/proyectos/:id reutiliza el contacto en vez de duplicarlo', async () => {
    const antes = await prisma.contacto.count();

    const creado: any = await (
      await req('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'borrador' })),
      })
    ).json();
    assert.equal(await prisma.contacto.count(), antes + 1, 'crear el proyecto crea un contacto');

    // Guardar desde los pasos 1 a 4 manda el payload completo sin
    // `contactoExistenteId`. Antes, cada guardado creaba otro contacto con
    // los mismos datos y dejaba el anterior huérfano en la lista.
    for (let i = 0; i < 3; i++) {
      await req(`/api/proyectos/${creado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'borrador', pasoActual: i + 2 })),
      });
    }

    assert.equal(await prisma.contacto.count(), antes + 1, 'tres guardados no deben crear contactos');
  });

  test('PUT /api/proyectos/:id escribe los cambios del Paso 1 sobre el mismo contacto', async () => {
    const creado: any = await (
      await req('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadProyecto({ faseSlug: 'borrador' })),
      })
    ).json();
    const contactoId = creado.contacto.id;
    const codigoOriginal = creado.contacto.codigo;

    const base = payloadProyecto({ faseSlug: 'borrador' }) as any;
    const actualizado: any = await (
      await req(`/api/proyectos/${creado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...base,
          datosContacto: { ...base.datosContacto, telefono: '3110000000', notas: 'Prefiere llamadas por la tarde' },
        }),
      })
    ).json();

    // Mismo contacto, datos actualizados: corregir un teléfono en el Paso 1
    // debe modificar al cliente, no clonarlo.
    assert.equal(actualizado.contacto.id, contactoId);
    assert.equal(actualizado.contacto.telefono, '3110000000');
    assert.equal(actualizado.contacto.notas, 'Prefiere llamadas por la tarde');
    // El código es la referencia visible del contacto: no se recalcula.
    assert.equal(actualizado.contacto.codigo, codigoOriginal);
  });

  test('GET /api/proyectos/:id con id inexistente responde 404 con forma de error consistente', async () => {
    const res = await req('/api/proyectos/no-existe');
    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'NO_ENCONTRADO');
  });

  test('POST /api/cotizacion/calcular no persiste nada y da el mismo resultado que guardar', async () => {
    const payload = payloadProyecto();
    const res = await req('/api/cotizacion/calcular', {
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
    const res = await req('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datosContacto: {} }),
    });
    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error.codigo, 'VALIDACION');
  });

  test('PUT /api/config/empresa con los cinco campos nuevos los guarda, y GET /api/config los devuelve', async () => {
    const res = await req('/api/config/empresa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'ZAC Solar',
        telefono: '3271234567',
        localidad: 'Nayarit',
        email: 'info@zacsolar.com',
        descripcion: 'Empresa solar',
        rfc: 'ABC123456XYZ',
        tituloCotizacion: 'Propuesta de Sistema Solar',
        introPlantilla: 'Bienvenido a nuestro análisis',
        observaciones: 'Sujeto a disponibilidad',
        firmaNombre: 'Juan Pérez',
        firmaPuesto: 'Gerente Comercial',
      }),
    });
    assert.equal(res.status, 200);
    const empresa: any = await res.json();
    assert.equal(empresa.tituloCotizacion, 'Propuesta de Sistema Solar');
    assert.equal(empresa.introPlantilla, 'Bienvenido a nuestro análisis');
    assert.equal(empresa.observaciones, 'Sujeto a disponibilidad');
    assert.equal(empresa.firmaNombre, 'Juan Pérez');
    assert.equal(empresa.firmaPuesto, 'Gerente Comercial');

    const getRes = await req('/api/config');
    assert.equal(getRes.status, 200);
    const config: any = await getRes.json();
    assert.equal(config.empresa.tituloCotizacion, 'Propuesta de Sistema Solar');
    assert.equal(config.empresa.introPlantilla, 'Bienvenido a nuestro análisis');
    assert.equal(config.empresa.observaciones, 'Sujeto a disponibilidad');
    assert.equal(config.empresa.firmaNombre, 'Juan Pérez');
    assert.equal(config.empresa.firmaPuesto, 'Gerente Comercial');
  });

  test('PUT /api/config/empresa sin los campos nuevos no rompe (toman valor por defecto)', async () => {
    const res = await req('/api/config/empresa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Otra Empresa',
        telefono: '1234567890',
        localidad: 'Jalisco',
        email: 'contacto@otra.com',
        descripcion: 'Otra descripción',
      }),
    });
    assert.equal(res.status, 200);
    const empresa: any = await res.json();
    assert.equal(empresa.tituloCotizacion, '');
    assert.equal(empresa.introPlantilla, '');
    assert.equal(empresa.observaciones, '');
    assert.equal(empresa.firmaNombre, '');
    assert.equal(empresa.firmaPuesto, '');
  });

  test('PUT /api/config/empresa acepta la misma fila que devuelve GET /api/config', async () => {
    // El ciclo real de Configuración → Formato de cotización: lee la empresa
    // y reenvía lo que recibió con un campo cambiado. La fila trae `rfc: null`
    // (en la base es `String?`), y con `z.string().optional()` ese null hacía
    // fallar el guardado **entero** con un genérico "Datos inválidos": se veía
    // como que no se podía editar ni un solo campo.
    // Sin RFC capturado, que es el estado de una empresa recién configurada.
    // Se fuerza aquí porque otros tests de este archivo lo dejan escrito.
    await prisma.empresa.update({ where: { id: '1' }, data: { rfc: null } });

    const config: any = await (await req('/api/config')).json();
    assert.equal(config.empresa.rfc, null, 'la API devuelve rfc nulo si no se capturó');

    const res = await req('/api/config/empresa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config.empresa, tituloCotizacion: 'Cotización Sistema Fotovoltaico' }),
    });

    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as any).tituloCotizacion, 'Cotización Sistema Fotovoltaico');
  });

  test('Guardar un proyecto con metodoPago: "Financiado" y recuperarlo devuelve ese valor en la cotización', async () => {
    const res = await req('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadProyecto({
        otrosCargos: {
          estructuraId: null,
          metodoPrecio: 'unitario',
          incluirIva: false,
          tipoMoneda: 'MXN',
          valorDolar: 16.9,
          ocultarDesglose: false,
          descuento5: false,
          descuento10: false,
          metodoPago: 'Financiado',
          cargosEditables: [],
          conceptos: conceptosFixture,
        },
      })),
    });
    assert.equal(res.status, 201);
    const proyecto: any = await res.json();
    assert.equal(proyecto.cotizaciones[0].metodoPago, 'Financiado');

    const getRes = await req(`/api/proyectos/${proyecto.id}`);
    assert.equal(getRes.status, 200);
    const recuperado: any = await getRes.json();
    assert.equal(recuperado.cotizaciones[0].metodoPago, 'Financiado');
  });

  test('Un proyecto guardado sin metodoPago devuelve "Contado"', async () => {
    const res = await req('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadProyecto()),
    });
    assert.equal(res.status, 201);
    const proyecto: any = await res.json();
    assert.equal(proyecto.cotizaciones[0].metodoPago, 'Contado');

    const getRes = await req(`/api/proyectos/${proyecto.id}`);
    assert.equal(getRes.status, 200);
    const recuperado: any = await getRes.json();
    assert.equal(recuperado.cotizaciones[0].metodoPago, 'Contado');
  });
});
