import { Hono } from 'hono';
import { z } from 'zod';
import type { MiddlewareHandler } from 'hono';
import { zValidator } from '../validacion.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';
import {
  generarHash,
  aUsuarioSesion,
  desactivarUsuario,
  borrarUsuario,
  cambiarRolUsuario,
} from '../servicios/auth.ts';

export const usuariosRoutes = new Hono<{ Variables: VariablesApp }>();

/** Solo un administrador puede gestionar usuarios desde el CRM. */
const soloAdmin: MiddlewareHandler<{ Variables: VariablesApp }> = async (c, next) => {
  const usuario = c.get('usuario');
  if (usuario.rol !== 'admin') {
    throw new ErrorApi('PERMISO_DENEGADO', 'Se requiere rol de administrador', 403);
  }
  await next();
};

usuariosRoutes.use('*', soloAdmin);

const crearUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(['admin', 'usuario']).default('usuario'),
});

const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email('Email inválido').optional(),
  rol: z.enum(['admin', 'usuario']).optional(),
  activo: z.boolean().optional(),
});

usuariosRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');
  const usuarios = await prisma.usuario.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  // Nunca se expone `passwordHash` ni `salt`, ni siquiera a un admin.
  return c.json(usuarios.map(aUsuarioSesion));
});

usuariosRoutes.post('/', zValidator('json', crearUsuarioSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');

  const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existente) {
    throw new ErrorApi('EMAIL_EN_USO', 'Ya existe otro usuario con ese email', 409);
  }

  const { salt, hash } = await generarHash(datos.password);
  const usuario = await prisma.usuario.create({
    data: { email: datos.email, nombre: datos.nombre, passwordHash: hash, salt, rol: datos.rol },
  });

  return c.json(aUsuarioSesion(usuario), 201);
});

usuariosRoutes.patch('/:id', zValidator('json', actualizarUsuarioSchema), async (c) => {
  const prisma = c.get('prisma');
  const solicitante = c.get('usuario');
  const usuarioId = c.req.param('id');

  const existente = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Usuario');

  const { rol, activo, nombre, email } = c.req.valid('json');

  if (email && email !== existente.email) {
    const otro = await prisma.usuario.findUnique({ where: { email } });
    if (otro && otro.id !== usuarioId) {
      throw new ErrorApi('EMAIL_EN_USO', 'Ya existe otro usuario con ese email', 409);
    }
  }

  await prisma.$transaction(async (tx) => {
    // El rol y la desactivación pasan por el servicio de auth: ahí viven las
    // invariantes (no autoacción, no dejar el sistema sin admin activo).
    if (rol !== undefined) {
      await cambiarRolUsuario(tx, usuarioId, rol, solicitante);
    }
    if (activo === false) {
      await desactivarUsuario(tx, usuarioId, solicitante.id);
    } else if (activo === true) {
      await tx.usuario.update({ where: { id: usuarioId }, data: { activo: true } });
    }
    if (nombre !== undefined || email !== undefined) {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { ...(nombre !== undefined ? { nombre } : {}), ...(email !== undefined ? { email } : {}) },
      });
    }
  });

  const actualizado = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!actualizado) throw new NoEncontradoError('Usuario');
  return c.json(aUsuarioSesion(actualizado));
});

usuariosRoutes.delete('/:id', async (c) => {
  const prisma = c.get('prisma');
  const solicitante = c.get('usuario');
  const usuarioId = c.req.param('id');

  const existente = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!existente || existente.deletedAt) throw new NoEncontradoError('Usuario');

  await prisma.$transaction((tx) => borrarUsuario(tx, usuarioId, solicitante.id));
  return c.body(null, 204);
});
