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
import { validarSesion } from '../servicios/auth.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';

/**
 * Tests de `GET /api/documentos/pdf/:tipo/:proyectoId`.
 *
 * El renderizador se inyecta falso a propósito: lo que hay que proteger aquí
 * no es Chromium —que no es nuestro código— sino el contrato alrededor, que es
 * donde están los fallos que llegarían al usuario: que la URL que recibe el
 * navegador lleve una sesión válida, que esa sesión deje de valer en cuanto
 * termina el render, y que la respuesta sea una descarga y no algo que el
 * navegador intente mostrar.
 */
describe('documentos: PDF generado en el servidor', () => {
  let dbPath: string;
  let prisma: PrismaClient;
  let authHeaders: Record<string, string>;
  let usuarioId: string;
  let proyectoId: string;
  let faseId: string;

  /** URLs que recibió el renderizador falso, en orden. */
  let urlsRenderizadas: string[];
  /** Token leído de la URL en el momento del render, y si entonces era válido. */
  let tokenValidoDuranteRender: boolean | null;
  let ultimoToken: string | null;
  let fallarRender: string | null;

  async function crearApp_(conRenderizador: boolean) {
    return crearApp(
      prisma,
      conRenderizador
        ? {
            pdf: {
              rendererBaseUrl: () => 'http://127.0.0.1:4321',
              renderizar: async (url) => {
                urlsRenderizadas.push(url);
                ultimoToken = new URL(url).searchParams.get('render');
                // La vista de impresión pide sus datos a esta misma API, así
                // que el token de la URL tiene que valer *durante* el render.
                tokenValidoDuranteRender = ultimoToken
                  ? (await validarSesion(prisma, ultimoToken)) !== null
                  : false;
                if (fallarRender) throw new Error(fallarRender);
                return Buffer.from('%PDF-1.4 falso');
              },
            },
          }
        : undefined
    );
  }

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-pdf-test-'));
    dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    ({ headers: authHeaders, usuarioId } = await crearAdminConSesion(prisma));

    const fase = await prisma.funnelFase.create({
      data: { nombre: 'Prospecto', slug: 'prospecto', orden: 1 },
    });
    faseId = fase.id;

    const contacto = await prisma.contacto.create({
      data: { codigo: 'YR-000001', nombre: 'Yareli', apellidoPaterno: 'Ramírez', telefono: '3271128421' },
    });
    // El nombre lleva acento y una barra a propósito: es lo que prueba que el
    // `Content-Disposition` sale con un nombre de archivo utilizable.
    const proyecto = await prisma.proyecto.create({
      data: { codigo: 'P-000001', contactoId: contacto.id, faseId, nombre: 'Casa Ramírez / Tepic' },
    });
    proyectoId = proyecto.id;
  });

  after(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  function reiniciarEspias() {
    urlsRenderizadas = [];
    tokenValidoDuranteRender = null;
    ultimoToken = null;
    fallarRender = null;
  }

  test('devuelve el PDF como descarga, con el nombre del proyecto', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    const res = await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, {
      headers: authHeaders,
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/pdf');

    // `attachment` es lo que convierte esto en una descarga en vez de un
    // visor de PDF abierto en una pestaña, que es justo lo que se quería
    // evitar. El nombre va sin acentos ni barras para que sea válido en
    // Windows, macOS y Linux.
    assert.equal(
      res.headers.get('Content-Disposition'),
      'attachment; filename="cotizacion-Casa-Ramirez-Tepic.pdf"'
    );

    const cuerpo = Buffer.from(await res.arrayBuffer());
    assert.equal(cuerpo.toString(), '%PDF-1.4 falso');
  });

  test('la URL del render apunta a la vista de impresión con tipo y proyecto', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, { headers: authHeaders });

    assert.equal(urlsRenderizadas.length, 1);
    const url = new URL(urlsRenderizadas[0]!);
    assert.equal(url.origin + url.pathname, 'http://127.0.0.1:4321/documentos/imprimir/');
    assert.equal(url.searchParams.get('tipo'), 'cotizacion');
    assert.equal(url.searchParams.get('proyectoId'), proyectoId);
  });

  test('el token de la URL es una sesión válida del usuario que pidió el PDF', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, { headers: authHeaders });

    assert.equal(tokenValidoDuranteRender, true);
    const usuario = await prisma.sesion.findFirst({ where: { usuarioId } });
    assert.ok(usuario, 'la sesión del usuario sigue existiendo');
  });

  test('el token del render queda revocado al terminar', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, { headers: authHeaders });

    assert.ok(ultimoToken);
    assert.equal(
      await validarSesion(prisma, ultimoToken!),
      null,
      'el token efímero no debe seguir sirviendo después del render'
    );
  });

  test('el token del render se revoca también si el render falla', async () => {
    reiniciarEspias();
    fallarRender = 'chromium explotó';
    const app = await crearApp_(true);
    const res = await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, {
      headers: authHeaders,
    });

    assert.equal(res.status, 500);
    const cuerpo = (await res.json()) as any;
    assert.equal(cuerpo.error.codigo, 'PDF_FALLO_RENDER');
    // El motivo real llega al usuario: sin él, "no se pudo generar" no deja
    // forma de saber que falta un Chromium.
    assert.match(cuerpo.error.mensaje, /chromium explotó/);

    assert.ok(ultimoToken);
    assert.equal(await validarSesion(prisma, ultimoToken!), null);
  });

  test('sin renderizador inyectado responde 503 y no 500', async () => {
    reiniciarEspias();
    const app = await crearApp_(false);
    const res = await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`, {
      headers: authHeaders,
    });

    assert.equal(res.status, 503);
    assert.equal(((await res.json()) as any).error.codigo, 'PDF_NO_DISPONIBLE');
  });

  test('rechaza tipos sin plantilla de impresión', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    const res = await app.request(`/api/documentos/pdf/ficha_panel/${proyectoId}`, {
      headers: authHeaders,
    });

    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as any).error.codigo, 'TIPO_NO_IMPRIMIBLE');
    assert.equal(urlsRenderizadas.length, 0, 'no debe arrancar un navegador para un tipo inválido');
  });

  test('proyecto inexistente da 404 sin arrancar el render', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    const res = await app.request('/api/documentos/pdf/cotizacion/no-existe', {
      headers: authHeaders,
    });

    assert.equal(res.status, 404);
    assert.equal(urlsRenderizadas.length, 0);
  });

  test('un proyecto borrado no se puede imprimir', async () => {
    reiniciarEspias();
    const contacto = await prisma.contacto.create({
      data: { codigo: 'BX-000002', nombre: 'Borrado', apellidoPaterno: 'X', telefono: '0000000000' },
    });
    const borrado = await prisma.proyecto.create({
      data: { codigo: 'P-000002', contactoId: contacto.id, faseId, nombre: 'Borrado', deletedAt: new Date() },
    });

    const app = await crearApp_(true);
    const res = await app.request(`/api/documentos/pdf/cotizacion/${borrado.id}`, {
      headers: authHeaders,
    });

    assert.equal(res.status, 404);
    assert.equal(urlsRenderizadas.length, 0);
  });

  test('exige sesión', async () => {
    reiniciarEspias();
    const app = await crearApp_(true);
    const res = await app.request(`/api/documentos/pdf/cotizacion/${proyectoId}`);

    assert.equal(res.status, 401);
    assert.equal(urlsRenderizadas.length, 0);
  });
});
