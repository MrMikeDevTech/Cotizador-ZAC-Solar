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
  const estatus = c.req.query('estatus');

  const proyectos = await prisma.proyecto.findMany({
    where: { deletedAt: null, ...(estatus ? { estatus } : {}) },
    include: { contacto: true },
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

const patchEstatusSchema = z.object({
  estatus: z.enum(['borrador', 'cotizado', 'enviado', 'vendido', 'perdido']),
});

proyectosRoutes.patch('/:id/estatus', zValidator('json', patchEstatusSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.proyecto.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Proyecto');

  const proyecto = await prisma.proyecto.update({
    where: { id: c.req.param('id') },
    data: { estatus: c.req.valid('json').estatus },
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
