import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const agendaRoutes = new Hono<{ Variables: VariablesApp }>();

/** Item homogéneo de la vista unificada de agenda. */
interface ItemAgenda {
  id: string;
  tipo: 'evento' | 'tarea' | 'proyecto';
  titulo: string;
  inicio: string;
  fin: string | null;
  proyectoId: string | null;
  contactoId: string | null;
  completada: boolean | null;
}

const rangoSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

const eventoSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().default(''),
  inicio: z.string().datetime(),
  fin: z.string().datetime().optional().nullable(),
  todoElDia: z.boolean().default(false),
  tipo: z.string().default('evento'),
  proyectoId: z.string().optional().nullable(),
  contactoId: z.string().optional().nullable(),
});

const eventoUpdateSchema = eventoSchema.partial();

// ─────────────────────────────────────────────────────────
// Vista unificada: eventos + tareas con vencimiento + proyectos creados
// ─────────────────────────────────────────────────────────

agendaRoutes.get('/', zValidator('query', rangoSchema), async (c) => {
  const prisma = c.get('prisma');
  const { desde, hasta } = c.req.valid('query');

  const rangoFecha = {
    ...(desde ? { gte: desde } : {}),
    ...(hasta ? { lte: hasta } : {}),
  };
  const conRango = Object.keys(rangoFecha).length > 0;

  const [eventos, tareas, proyectos] = await Promise.all([
    prisma.eventoAgenda.findMany({
      where: { deletedAt: null, ...(conRango ? { inicio: rangoFecha } : {}) },
    }),
    prisma.tarea.findMany({
      where: { fechaVencimiento: { not: null, ...(conRango ? rangoFecha : {}) } },
    }),
    prisma.proyecto.findMany({
      where: { deletedAt: null, ...(conRango ? { createdAt: rangoFecha } : {}) },
      include: { contacto: true },
    }),
  ]);

  const items: ItemAgenda[] = [
    ...eventos.map((e) => ({
      id: e.id,
      tipo: 'evento' as const,
      titulo: e.titulo,
      inicio: e.inicio.toISOString(),
      fin: e.fin ? e.fin.toISOString() : null,
      proyectoId: e.proyectoId,
      contactoId: e.contactoId,
      completada: null,
    })),
    ...tareas.map((t) => ({
      id: t.id,
      tipo: 'tarea' as const,
      titulo: t.titulo,
      inicio: (t.fechaVencimiento as Date).toISOString(),
      fin: null,
      proyectoId: t.proyectoId,
      contactoId: t.contactoId,
      completada: t.completada,
    })),
    ...proyectos.map((p) => ({
      id: p.id,
      tipo: 'proyecto' as const,
      titulo: p.nombre,
      inicio: p.createdAt.toISOString(),
      fin: null,
      proyectoId: p.id,
      contactoId: p.contactoId,
      completada: null,
    })),
  ];

  items.sort((a, b) => a.inicio.localeCompare(b.inicio));

  return c.json(items);
});

// ─────────────────────────────────────────────────────────
// CRUD de EventoAgenda
// ─────────────────────────────────────────────────────────

agendaRoutes.post('/', zValidator('json', eventoSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');

  const evento = await prisma.eventoAgenda.create({
    data: {
      ...datos,
      inicio: new Date(datos.inicio),
      fin: datos.fin ? new Date(datos.fin) : null,
    },
  });
  return c.json(evento, 201);
});

agendaRoutes.patch('/:id', zValidator('json', eventoUpdateSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.eventoAgenda.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Evento');

  const { inicio, fin, ...resto } = c.req.valid('json');
  const evento = await prisma.eventoAgenda.update({
    where: { id: c.req.param('id') },
    data: {
      ...resto,
      ...(inicio !== undefined ? { inicio: new Date(inicio) } : {}),
      ...(fin !== undefined ? { fin: fin ? new Date(fin) : null } : {}),
    },
  });
  return c.json(evento);
});

agendaRoutes.delete('/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.eventoAgenda.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Evento');
  await prisma.eventoAgenda.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date() } });
  return c.body(null, 204);
});
