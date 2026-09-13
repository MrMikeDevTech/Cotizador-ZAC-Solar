import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { z } from 'zod';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const documentosRoutes = new Hono<{ Variables: VariablesApp }>();

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
