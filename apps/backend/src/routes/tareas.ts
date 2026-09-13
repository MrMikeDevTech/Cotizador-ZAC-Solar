import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { z } from 'zod';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const tareasRoutes = new Hono<{ Variables: VariablesApp }>();

const tareaSchema = z.object({
  proyectoId: z.string().optional(),
  contactoId: z.string().optional(),
  titulo: z.string().min(1),
  descripcion: z.string().default(''),
  fechaVencimiento: z.string().datetime().optional().nullable(),
});

tareasRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');
  const proyectoId = c.req.query('proyectoId');
  const completada = c.req.query('completada');

  const tareas = await prisma.tarea.findMany({
    where: {
      ...(proyectoId ? { proyectoId } : {}),
      ...(completada !== undefined ? { completada: completada === 'true' } : {}),
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  return c.json(tareas);
});

tareasRoutes.post('/', zValidator('json', tareaSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');
  const tarea = await prisma.tarea.create({
    data: {
      ...datos,
      fechaVencimiento: datos.fechaVencimiento ? new Date(datos.fechaVencimiento) : null,
    },
  });
  return c.json(tarea, 201);
});

tareasRoutes.patch('/:id', zValidator('json', tareaSchema.partial().extend({ completada: z.boolean().optional() })), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.tarea.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Tarea');

  const { fechaVencimiento, ...resto } = c.req.valid('json');
  const tarea = await prisma.tarea.update({
    where: { id: c.req.param('id') },
    data: {
      ...resto,
      ...(fechaVencimiento !== undefined ? { fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null } : {}),
    },
  });
  return c.json(tarea);
});

tareasRoutes.delete('/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.tarea.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Tarea');
  await prisma.tarea.delete({ where: { id: c.req.param('id') } });
  return c.body(null, 204);
});
