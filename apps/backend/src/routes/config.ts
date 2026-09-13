import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import { panelSchema, inversorSchema, estructuraSchema, conceptoPlantillaSchema, empresaSchema, factoresCalculoSchema } from '@cotizador/shared';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const configRoutes = new Hono<{ Variables: VariablesApp }>();

configRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');

  const [empresa, factoresRaw, paneles, inversores, estructuras, conceptos, tarifas, localidades] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: '1' } }),
    prisma.factoresCalculo.findUnique({ where: { id: '1' } }),
    prisma.panel.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } }),
    prisma.inversor.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } }),
    prisma.estructura.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } }),
    prisma.conceptoPlantilla.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } }),
    prisma.tarifa.findMany(),
    prisma.localidad.findMany(),
  ]);

  const factores = factoresRaw
    ? { ...factoresRaw, factoresEstacionales: JSON.parse(factoresRaw.factoresEstacionales) }
    : null;

  return c.json({ empresa, factores, paneles, inversores, estructuras, conceptos, tarifas, localidades });
});

configRoutes.put('/empresa', zValidator('json', empresaSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');
  const empresa = await prisma.empresa.upsert({
    where: { id: '1' },
    create: { id: '1', ...datos },
    update: datos,
  });
  return c.json(empresa);
});

configRoutes.put('/factores', zValidator('json', factoresCalculoSchema), async (c) => {
  const prisma = c.get('prisma');
  const { factoresEstacionales, ...resto } = c.req.valid('json');
  const data = { ...resto, factoresEstacionales: JSON.stringify(factoresEstacionales) };
  const factores = await prisma.factoresCalculo.upsert({
    where: { id: '1' },
    create: { id: '1', ...data },
    update: data,
  });
  return c.json({ ...factores, factoresEstacionales: JSON.parse(factores.factoresEstacionales) });
});

// --- Paneles ---
configRoutes.post('/paneles', zValidator('json', panelSchema), async (c) => {
  const prisma = c.get('prisma');
  const panel = await prisma.panel.create({ data: c.req.valid('json') });
  return c.json(panel, 201);
});

configRoutes.put('/paneles/:id', zValidator('json', panelSchema.partial()), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.panel.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Panel');
  const panel = await prisma.panel.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(panel);
});

configRoutes.delete('/paneles/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.panel.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Panel');
  await prisma.panel.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date(), activo: false } });
  return c.body(null, 204);
});

// --- Inversores ---
configRoutes.post('/inversores', zValidator('json', inversorSchema), async (c) => {
  const prisma = c.get('prisma');
  const inversor = await prisma.inversor.create({ data: c.req.valid('json') });
  return c.json(inversor, 201);
});

configRoutes.put('/inversores/:id', zValidator('json', inversorSchema.partial()), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.inversor.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Inversor');
  const inversor = await prisma.inversor.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(inversor);
});

configRoutes.delete('/inversores/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.inversor.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Inversor');
  await prisma.inversor.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date(), activo: false } });
  return c.body(null, 204);
});

// --- Estructuras ---
configRoutes.post('/estructuras', zValidator('json', estructuraSchema), async (c) => {
  const prisma = c.get('prisma');
  const estructura = await prisma.estructura.create({ data: c.req.valid('json') });
  return c.json(estructura, 201);
});

configRoutes.put('/estructuras/:id', zValidator('json', estructuraSchema.partial()), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.estructura.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Estructura');
  const estructura = await prisma.estructura.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(estructura);
});

configRoutes.delete('/estructuras/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.estructura.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Estructura');
  await prisma.estructura.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date(), activo: false } });
  return c.body(null, 204);
});

// --- Conceptos ---
configRoutes.post('/conceptos', zValidator('json', conceptoPlantillaSchema), async (c) => {
  const prisma = c.get('prisma');
  const concepto = await prisma.conceptoPlantilla.create({ data: c.req.valid('json') });
  return c.json(concepto, 201);
});

configRoutes.put('/conceptos/:id', zValidator('json', conceptoPlantillaSchema.partial()), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.conceptoPlantilla.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Concepto');
  const concepto = await prisma.conceptoPlantilla.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(concepto);
});

configRoutes.delete('/conceptos/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.conceptoPlantilla.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Concepto');
  await prisma.conceptoPlantilla.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date(), activo: false } });
  return c.body(null, 204);
});

// --- Tarifas ---
const tarifaUpdateSchema = z.object({
  limiteDac: z.number().nullable().optional(),
  esNueva: z.boolean().optional(),
});

configRoutes.put('/tarifas/:id', zValidator('json', tarifaUpdateSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.tarifa.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Tarifa');
  const tarifa = await prisma.tarifa.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(tarifa);
});

// --- Localidades ---
const localidadUpdateSchema = z.object({
  factorProduccion: z.number().optional(),
  horasSol: z.number().optional(),
});

configRoutes.put('/localidades/:id', zValidator('json', localidadUpdateSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.localidad.findUnique({ where: { id: c.req.param('id') } });
  if (!existente) throw new NoEncontradoError('Localidad');
  const localidad = await prisma.localidad.update({ where: { id: c.req.param('id') }, data: c.req.valid('json') });
  return c.json(localidad);
});
