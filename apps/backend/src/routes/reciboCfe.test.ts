import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutarMigraciones } from '../db/migrador.ts';
import { crearClientePrisma } from '../db/cliente.ts';
import { sembrarCatalogos } from '../db/seed.ts';
import { crearApp } from '../app.ts';
import { crearAdminConSesion } from '../test-helpers/auth.ts';
import { cerrarOcr } from '../servicios/extraerTextoRecibo.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';

/**
 * Tests de `POST /api/cotizacion/parsear-recibo-cfe`.
 *
 * El recibo real vive en `docs/referencia-recibo-cfe/` (no se versiona: trae el
 * nombre y el número de servicio de una persona). Si no está, ese test se
 * omite. Sus aserciones evitan copiar datos personales a este archivo: se
 * comprueba el formato de lo personal y el valor exacto de lo que no lo es.
 */

const RUTA = '/api/cotizacion/parsear-recibo-cfe';
const RECIBO_REAL = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..', 'docs', 'referencia-recibo-cfe', 'recibo-example.pdf'
);

/** PDF mínimo de una página en blanco (pdfium y pdf.js reconstruyen la tabla xref). */
const PDF_EN_BLANCO = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R/Size 4>>
%%EOF`;

describe('POST /api/cotizacion/parsear-recibo-cfe', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof crearApp>;
  let authHeaders: Record<string, string>;

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotizador-recibo-test-'));
    const dbPath = join(dir, 'test.db');
    ejecutarMigraciones(dbPath);
    prisma = crearClientePrisma(dbPath);
    await sembrarCatalogos(prisma);
    ({ headers: authHeaders } = await crearAdminConSesion(prisma));
    app = crearApp(prisma);
  });

  after(async () => {
    await cerrarOcr();
  });

  function subir(contenido: string | Uint8Array | Buffer, nombre = 'recibo.pdf', tipo = 'application/pdf') {
    const form = new FormData();
    form.append('archivo', new File([contenido], nombre, { type: tipo }));
    return app.request(RUTA, { method: 'POST', body: form, headers: authHeaders });
  }

  async function error(res: Response) {
    return ((await res.json()) as { error: { codigo: string; mensaje: string } }).error;
  }

  test('exige sesión', async () => {
    const form = new FormData();
    form.append('archivo', new File(['%PDF-'], 'r.pdf', { type: 'application/pdf' }));
    const res = await app.request(RUTA, { method: 'POST', body: form });
    assert.equal(res.status, 401);
  });

  test('sin el campo "archivo" responde 400 RECIBO_INVALIDO', async () => {
    const form = new FormData();
    form.append('otro', 'x');
    const res = await app.request(RUTA, { method: 'POST', body: form, headers: authHeaders });
    assert.equal(res.status, 400);
    assert.equal((await error(res)).codigo, 'RECIBO_INVALIDO');
  });

  test('un cuerpo que no es multipart responde 400 RECIBO_INVALIDO', async () => {
    const res = await app.request(RUTA, {
      method: 'POST',
      body: JSON.stringify({ archivo: 'x' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 400);
    assert.equal((await error(res)).codigo, 'RECIBO_INVALIDO');
  });

  test('un archivo que no es PDF se rechaza aunque diga serlo', async () => {
    const res = await subir('esto es texto, no un pdf', 'recibo.pdf', 'application/pdf');
    assert.equal(res.status, 400);
    const e = await error(res);
    assert.equal(e.codigo, 'RECIBO_INVALIDO');
    assert.match(e.mensaje, /no es un PDF/);
  });

  test('un archivo vacío se rechaza', async () => {
    const res = await subir(new Uint8Array(0));
    assert.equal(res.status, 400);
    assert.equal((await error(res)).codigo, 'RECIBO_INVALIDO');
  });

  test('un archivo de más de 10 MB se rechaza', async () => {
    const grande = new Uint8Array(10 * 1024 * 1024 + 1);
    grande.set(new TextEncoder().encode('%PDF-'));
    const res = await subir(grande);
    assert.equal(res.status, 400);
    assert.equal((await error(res)).codigo, 'RECIBO_INVALIDO');
  });

  test('un PDF sin texto legible responde 422 RECIBO_ILEGIBLE', async () => {
    const res = await subir(PDF_EN_BLANCO);
    assert.equal(res.status, 422);
    assert.equal((await error(res)).codigo, 'RECIBO_ILEGIBLE');
  });

  test(
    'el recibo real (PDF impreso desde iOS, con capa de texto dañada) se lee por OCR',
    { skip: !existsSync(RECIBO_REAL) && 'falta docs/referencia-recibo-cfe/recibo-example.pdf', timeout: 180_000 },
    async () => {
      const res = await subir(await readFile(RECIBO_REAL));
      assert.equal(res.status, 200);
      const { datos, advertencias, origenTexto } = (await res.json()) as {
        datos: Record<string, any>;
        advertencias: string[];
        origenTexto: string;
      };

      // La capa de texto de este PDF es ilegible: tuvo que salir del OCR.
      assert.equal(origenTexto, 'ocr');

      // Datos personales: solo su forma.
      assert.match(datos.numeroServicio, /^\d{12}$/);
      assert.ok(datos.nombreCliente.length > 0);
      assert.equal(datos.nombreProyecto, `${datos.nombreCliente} - ${datos.localidad}`);

      // Datos no personales: valor exacto.
      assert.equal(datos.tarifa, '1B');
      assert.equal(datos.hilos, '1 hilo');
      assert.equal(datos.localidad, 'Ixtapa');
      assert.equal(datos.estado, 'Nayarit');
      assert.equal(datos.periodo, 'Bimestral');
      assert.equal(datos.fechaInicio, '2026-06-12');
      assert.deepEqual(
        datos.consumosHistoricos.map((c: { kwh: number }) => c.kwh),
        [1741, 1584, 1320, 1252, 1491, 1494]
      );
      assert.deepEqual(
        datos.consumosHistoricos.map((c: { importe: number }) => c.importe),
        [12908, 11993, 10611, 9290, 10495, 10473]
      );
      assert.deepEqual(advertencias, []);
    }
  );
});
