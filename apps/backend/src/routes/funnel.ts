import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const funnelRoutes = new Hono<{ Variables: VariablesApp }>();

const faseSchema = z.object({
  nombre: z.string().min(1),
  color: z.string().min(1),
});

const faseUpdateSchema = faseSchema.partial();

const ordenSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const moverProyectoSchema = z.object({
  faseSlug: z.string().min(1),
  /** Posición dentro de la columna destino, 0-based. */
  ordenEnFase: z.number().int().min(0),
});

// ─────────────────────────────────────────────────────────
// Fases
// ─────────────────────────────────────────────────────────

funnelRoutes.get('/fases', async (c) => {
  const prisma = c.get('prisma');

  const fases = await prisma.funnelFase.findMany({
    where: { deletedAt: null },
    orderBy: { orden: 'asc' },
    include: { _count: { select: { proyectos: { where: { deletedAt: null } } } } },
  });

  return c.json(
    fases.map((fase) => ({
      id: fase.id,
      nombre: fase.nombre,
      slug: fase.slug,
      orden: fase.orden,
      color: fase.color,
      esSistema: fase.esSistema,
      totalProyectos: fase._count.proyectos,
    }))
  );
});

funnelRoutes.post('/fases', zValidator('json', faseSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');

  const ultima = await prisma.funnelFase.findFirst({
    where: { deletedAt: null },
    orderBy: { orden: 'desc' },
  });

  const slugBase = datos.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = `${slugBase || 'fase'}-${Date.now().toString(36)}`;

  const fase = await prisma.funnelFase.create({
    data: {
      nombre: datos.nombre,
      color: datos.color,
      slug,
      orden: (ultima?.orden ?? -1) + 1,
      esSistema: false,
    },
  });

  return c.json(fase, 201);
});

funnelRoutes.put('/fases/orden', zValidator('json', ordenSchema), async (c) => {
  const prisma = c.get('prisma');
  const { ids } = c.req.valid('json');

  await prisma.$transaction(
    ids.map((id, orden) => prisma.funnelFase.update({ where: { id }, data: { orden } }))
  );

  const fases = await prisma.funnelFase.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } });
  return c.json(fases);
});

funnelRoutes.put('/fases/:id', zValidator('json', faseUpdateSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.funnelFase.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Fase');

  const fase = await prisma.funnelFase.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(fase);
});

funnelRoutes.delete('/fases/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.funnelFase.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Fase');

  if (existente.esSistema) {
    throw new ErrorApi('FASE_SISTEMA', 'No se puede borrar una fase de sistema', 403);
  }

  const totalProyectos = await prisma.proyecto.count({ where: { faseId: existente.id, deletedAt: null } });
  if (totalProyectos > 0) {
    throw new ErrorApi(
      'FASE_CON_PROYECTOS',
      `No se puede borrar: la fase tiene ${totalProyectos} proyecto(s) asignado(s)`,
      409
    );
  }

  await prisma.funnelFase.update({ where: { id: existente.id }, data: { deletedAt: new Date() } });
  return c.body(null, 204);
});

// ─────────────────────────────────────────────────────────
// Tablero
// ─────────────────────────────────────────────────────────

funnelRoutes.get('/tablero', async (c) => {
  const prisma = c.get('prisma');

  const fases = await prisma.funnelFase.findMany({
    where: { deletedAt: null },
    orderBy: { orden: 'asc' },
    include: {
      proyectos: {
        where: { deletedAt: null },
        orderBy: { ordenEnFase: 'asc' },
        include: {
          contacto: true,
          cotizaciones: { orderBy: { version: 'desc' }, take: 1 },
        },
      },
    },
  });

  return c.json(
    fases.map((fase) => ({
      id: fase.id,
      nombre: fase.nombre,
      slug: fase.slug,
      orden: fase.orden,
      color: fase.color,
      esSistema: fase.esSistema,
      proyectos: fase.proyectos.map((proyecto) => ({
        id: proyecto.id,
        codigo: proyecto.codigo,
        nombre: proyecto.nombre,
        ordenEnFase: proyecto.ordenEnFase,
        contacto: {
          id: proyecto.contacto.id,
          nombre: proyecto.contacto.nombre,
          apellidoPaterno: proyecto.contacto.apellidoPaterno,
          apellidoMaterno: proyecto.contacto.apellidoMaterno,
        },
        granTotal: proyecto.cotizaciones[0]?.granTotal ?? null,
      })),
    }))
  );
});

// ─────────────────────────────────────────────────────────
// Mover proyecto entre columnas (drag & drop del tablero)
// ─────────────────────────────────────────────────────────

funnelRoutes.put('/proyectos/:id/mover', zValidator('json', moverProyectoSchema), async (c) => {
  const prisma = c.get('prisma');
  const proyectoId = c.req.param('id');
  const { faseSlug, ordenEnFase: ordenDestino } = c.req.valid('json');

  await prisma.$transaction(async (tx) => {
    const proyecto = await tx.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto || proyecto.deletedAt) throw new NoEncontradoError('Proyecto');

    const faseDestino = await tx.funnelFase.findUnique({ where: { slug: faseSlug } });
    if (!faseDestino || faseDestino.deletedAt) throw new NoEncontradoError(`Fase ${faseSlug}`);

    const faseOrigenId = proyecto.faseId;
    const mismaColumna = faseOrigenId === faseDestino.id;

    // Columna destino, sin el proyecto que se está moviendo: aquí es donde se
    // inserta en la posición pedida y se recompacta para no dejar huecos ni
    // empates en `ordenEnFase`.
    const proyectosDestino = await tx.proyecto.findMany({
      where: { faseId: faseDestino.id, deletedAt: null, id: { not: proyectoId } },
      orderBy: { ordenEnFase: 'asc' },
    });

    const posicion = Math.max(0, Math.min(ordenDestino, proyectosDestino.length));
    const conMovido = [
      ...proyectosDestino.slice(0, posicion),
      proyecto,
      ...proyectosDestino.slice(posicion),
    ];

    await Promise.all(
      conMovido.map((p, orden) =>
        tx.proyecto.update({
          where: { id: p.id },
          data: { ordenEnFase: orden, ...(p.id === proyectoId ? { faseId: faseDestino.id } : {}) },
        })
      )
    );

    // Si cambió de columna, la de origen también se recompacta para cerrar el hueco.
    if (!mismaColumna) {
      const proyectosOrigen = await tx.proyecto.findMany({
        where: { faseId: faseOrigenId, deletedAt: null, id: { not: proyectoId } },
        orderBy: { ordenEnFase: 'asc' },
      });
      await Promise.all(
        proyectosOrigen.map((p, orden) => tx.proyecto.update({ where: { id: p.id }, data: { ordenEnFase: orden } }))
      );
    }
  });

  const actualizado = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: { fase: true, contacto: true },
  });
  return c.json(actualizado);
});
