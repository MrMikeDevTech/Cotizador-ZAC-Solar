import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { z } from 'zod';
import { guardarProyectoSchema } from '@cotizador/shared';
import { guardarProyecto, obtenerProyectoHidratado } from '../servicios/proyectos.ts';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const proyectosRoutes = new Hono<{ Variables: VariablesApp }>();

proyectosRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');
  const faseSlug = c.req.query('fase');

  const proyectos = await prisma.proyecto.findMany({
    where: { deletedAt: null, ...(faseSlug ? { fase: { slug: faseSlug } } : {}) },
    include: { contacto: true, fase: true },
    orderBy: { updatedAt: 'desc' },
  });

  return c.json(proyectos);
});

proyectosRoutes.get('/:id', async (c) => {
  const prisma = c.get('prisma');
  const proyecto = await obtenerProyectoHidratado(prisma, c.req.param('id'));
  return c.json(proyecto);
});

proyectosRoutes.post('/', zValidator('json', guardarProyectoSchema), async (c) => {
  const prisma = c.get('prisma');
  const payload = c.req.valid('json');
  const proyecto = await guardarProyecto(prisma, payload);
  return c.json(proyecto, 201);
});

proyectosRoutes.put('/:id', zValidator('json', guardarProyectoSchema), async (c) => {
  const prisma = c.get('prisma');
  const payload = c.req.valid('json');
  const proyecto = await guardarProyecto(prisma, payload, c.req.param('id'));
  return c.json(proyecto);
});

const patchFaseSchema = z.object({
  faseSlug: z.string().min(1),
  /** Posición dentro de la columna destino. Omitirla la manda al final. */
  ordenEnFase: z.number().int().min(0).optional(),
});

proyectosRoutes.patch('/:id/fase', zValidator('json', patchFaseSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.proyecto.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Proyecto');

  const { faseSlug, ordenEnFase } = c.req.valid('json');
  const fase = await prisma.funnelFase.findUnique({ where: { slug: faseSlug } });
  if (!fase || fase.deletedAt) throw new NoEncontradoError(`Fase ${faseSlug}`);

  const proyecto = await prisma.proyecto.update({
    where: { id: c.req.param('id') },
    data: { faseId: fase.id, ...(ordenEnFase !== undefined ? { ordenEnFase } : {}) },
    include: { fase: true },
  });
  return c.json(proyecto);
});

proyectosRoutes.delete('/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.proyecto.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Proyecto');
  await prisma.proyecto.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date() } });
  return c.body(null, 204);
});
