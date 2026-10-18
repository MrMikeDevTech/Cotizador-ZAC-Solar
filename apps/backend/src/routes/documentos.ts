import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { z } from 'zod';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';
import { crearSesion, invalidarSesion } from '../servicios/auth.ts';

export const documentosRoutes = new Hono<{ Variables: VariablesApp }>();

/** Documentos que la vista `/documentos/imprimir` sabe renderizar. */
const TIPOS_IMPRIMIBLES = new Set(['cotizacion', 'contrato', 'carta-poder']);

/**
 * Vida del token con el que el navegador headless carga la vista de impresión.
 * Sólo tiene que durar lo que tarda un render; se revoca en cuanto termina.
 */
const DURACION_TOKEN_RENDER_MS = 60_000;

/** Deja un nombre de archivo utilizable en Windows, macOS y Linux. */
function nombreArchivoSeguro(base: string): string {
  const limpio = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return limpio.slice(0, 80) || 'documento';
}

/**
 * Genera el PDF en el servidor y lo devuelve como descarga.
 *
 * Existe porque un navegador no puede producir un PDF por su cuenta: desde la
 * web lo único disponible es `window.print()`, que abre el diálogo de
 * impresión y obliga al usuario a elegir "Guardar como PDF". Aquí el
 * documento llega ya renderizado y el botón descarga un archivo, igual que en
 * el escritorio.
 *
 * El renderizado lo hace quien corresponda según el entorno (ver `OpcionesPdf`);
 * esta ruta sólo decide *qué* se renderiza, mintea una sesión efímera para que
 * la vista de impresión pueda pedir sus datos a esta misma API, y la revoca al
 * terminar.
 */
documentosRoutes.get('/pdf/:tipo/:proyectoId', async (c) => {
  const tipo = c.req.param('tipo');
  const proyectoId = c.req.param('proyectoId');

  if (!TIPOS_IMPRIMIBLES.has(tipo)) {
    throw new ErrorApi('TIPO_NO_IMPRIMIBLE', `No hay plantilla de impresión para "${tipo}"`, 400);
  }

  const pdf = c.get('pdf');
  if (!pdf) {
    throw new ErrorApi(
      'PDF_NO_DISPONIBLE',
      'Este backend no tiene con qué generar PDFs. En la app instalada lo hace Electron; ' +
        'en desarrollo hace falta un Chromium en el sistema.',
      503
    );
  }

  const prisma = c.get('prisma');
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, nombre: true, deletedAt: true },
  });
  if (!proyecto || proyecto.deletedAt) throw new NoEncontradoError('Proyecto');

  const base = pdf.rendererBaseUrl();
  if (!base) {
    throw new ErrorApi('PDF_NO_DISPONIBLE', 'Todavía no se conoce la URL del renderer', 503);
  }

  // Sesión de un minuto para el render: la vista de impresión es una página
  // normal del renderer y pide sus datos a esta API como cualquier otra, así
  // que necesita autenticarse. Va en la URL porque es lo único que el
  // navegador headless recibe, y es aceptable aquí: la API sólo escucha en
  // 127.0.0.1, el token caduca en 60 s y se revoca en el `finally`.
  const tokenRender = await crearSesion(prisma, c.get('usuario').id, DURACION_TOKEN_RENDER_MS);

  try {
    const url = `${base}/documentos/imprimir/?tipo=${encodeURIComponent(tipo)}&proyectoId=${encodeURIComponent(
      proyectoId
    )}&render=${encodeURIComponent(tokenRender)}`;

    const bytes = await pdf.renderizar(url);
    const nombre = `${nombreArchivoSeguro(`${tipo}-${proyecto.nombre}`)}.pdf`;

    return c.body(new Uint8Array(bytes), 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store',
    });
  } catch (error) {
    throw new ErrorApi(
      'PDF_FALLO_RENDER',
      error instanceof Error ? error.message : 'No se pudo generar el PDF',
      500
    );
  } finally {
    await invalidarSesion(prisma, tokenRender).catch(() => {});
  }
});

documentosRoutes.get('/proyectos/:proyectoId', async (c) => {
  const prisma = c.get('prisma');
  const documentos = await prisma.documento.findMany({
    where: { proyectoId: c.req.param('proyectoId') },
    orderBy: { generadoEn: 'desc' },
  });
  return c.json(documentos);
});

const registrarDocumentoSchema = z.object({
  nombreArchivo: z.string().min(1),
  ruta: z.string().min(1),
});

documentosRoutes.post(
  '/proyectos/:proyectoId/:tipo',
  zValidator('json', registrarDocumentoSchema),
  async (c) => {
    const prisma = c.get('prisma');
    const proyecto = await prisma.proyecto.findUnique({ where: { id: c.req.param('proyectoId') } });
    if (!proyecto || proyecto.deletedAt) throw new NoEncontradoError('Proyecto');

    const documento = await prisma.documento.create({
      data: {
        proyectoId: c.req.param('proyectoId'),
        tipo: c.req.param('tipo'),
        ...c.req.valid('json'),
      },
    });
    return c.json(documento, 201);
  }
);

documentosRoutes.get('/plantillas', async (c) => {
  const prisma = c.get('prisma');
  const tipo = c.req.query('tipo');
  const referenciaId = c.req.query('referenciaId');
  const plantillas = await prisma.plantillaDocumento.findMany({
    where: { ...(tipo ? { tipo } : {}), ...(referenciaId ? { referenciaId } : {}) },
  });
  return c.json(plantillas);
});

const plantillaSchema = z.object({
  tipo: z.string().min(1),
  nombre: z.string().min(1),
  rutaArchivo: z.string().min(1),
  referenciaId: z.string().optional(),
});

documentosRoutes.post('/plantillas', zValidator('json', plantillaSchema), async (c) => {
  const prisma = c.get('prisma');
  const plantilla = await prisma.plantillaDocumento.create({ data: c.req.valid('json') });
  return c.json(plantilla, 201);
});

documentosRoutes.delete('/plantillas/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.plantillaDocumento.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Plantilla');
  await prisma.plantillaDocumento.delete({ where: { id: c.req.param('id') } });
  return c.body(null, 204);
});
