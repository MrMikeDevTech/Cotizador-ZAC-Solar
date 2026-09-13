import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { datosContactoSchema, generarCodigoAbreviado } from '@cotizador/shared';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const contactosRoutes = new Hono<{ Variables: VariablesApp }>();

contactosRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');
  const q = c.req.query('q')?.trim();

  const contactos = await prisma.contacto.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nombre: { contains: q } },
              { apellidoPaterno: { contains: q } },
              { apellidoMaterno: { contains: q } },
              { telefono: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: 'asc' },
    take: 50,
  });

  return c.json(contactos);
});

contactosRoutes.get('/:id', async (c) => {
  const prisma = c.get('prisma');
  const contacto = await prisma.contacto.findUnique({ where: { id: c.req.param('id') } });
  if (!contacto || contacto.deletedAt) throw new NoEncontradoError('Contacto');
  return c.json(contacto);
});

contactosRoutes.post('/', zValidator('json', datosContactoSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');
  const nombreCompleto = [datos.nombre, datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(' ');

  const contacto = await prisma.contacto.create({
    data: {
      codigo: generarCodigoAbreviado(nombreCompleto, String(Date.now()).slice(-6)),
      nombre: datos.nombre,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      telefono: datos.telefono,
      celular: datos.celular,
      email: datos.email,
      estado: datos.estado,
      localidad: datos.localidad,
      fuenteContacto: datos.fuenteContacto,
      estatus: datos.estatus,
      notas: datos.notas,
      esEmpresa: datos.mostrarEmpresariales,
      rfc: datos.empresariales.rfc,
      cargo: datos.empresariales.cargo,
      razonSocial: datos.empresariales.razonSocial,
      actividadComercial: datos.empresariales.actividadComercial,
    },
  });

  return c.json(contacto, 201);
});

contactosRoutes.put('/:id', zValidator('json', datosContactoSchema), async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.contacto.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Contacto');

  const datos = c.req.valid('json');
  const contacto = await prisma.contacto.update({
    where: { id: c.req.param('id') },
    data: {
      nombre: datos.nombre,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      telefono: datos.telefono,
      celular: datos.celular,
      email: datos.email,
      estado: datos.estado,
      localidad: datos.localidad,
      fuenteContacto: datos.fuenteContacto,
      estatus: datos.estatus,
      notas: datos.notas,
      esEmpresa: datos.mostrarEmpresariales,
      rfc: datos.empresariales.rfc,
      cargo: datos.empresariales.cargo,
      razonSocial: datos.empresariales.razonSocial,
      actividadComercial: datos.empresariales.actividadComercial,
    },
  });

  return c.json(contacto);
});

contactosRoutes.delete('/:id', async (c) => {
  const prisma = c.get('prisma');
  const existente = await prisma.contacto.findUnique({ where: { id: c.req.param('id') } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Contacto');
  await prisma.contacto.update({ where: { id: c.req.param('id') }, data: { deletedAt: new Date() } });
  return c.body(null, 204);
});
