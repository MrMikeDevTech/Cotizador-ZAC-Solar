import { Hono } from 'hono';
import { z } from 'zod';
import type { Context } from 'hono';
import { zValidator } from '../validacion.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';
import {
  generarHash,
  verificarPassword,
  simularVerificacionPassword,
  crearSesion,
  limpiarSesionesExpiradas,
  invalidarSesion,
  invalidarOtrasSesiones,
  hashearToken,
  aUsuarioSesion,
  verificarLimiteIntentos,
  registrarIntentoFallido,
  limpiarIntentosFallidos,
} from '../servicios/auth.ts';

export const authRoutes = new Hono<{ Variables: VariablesApp }>();

const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

/** Extrae el token crudo del header `Authorization: Bearer <token>`, o `null` si no está presente. */
function obtenerToken(c: Context): string | null {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

// ─────────────────────────────────────────────────────────
// Públicas
// ─────────────────────────────────────────────────────────

authRoutes.get('/estado', async (c) => {
  const prisma = c.get('prisma');
  const hayUsuarios = (await prisma.usuario.count()) > 0;
  return c.json({ hayUsuarios });
});

const primerAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

authRoutes.post('/primer-admin', zValidator('json', primerAdminSchema), async (c) => {
  const prisma = c.get('prisma');
  const datos = c.req.valid('json');

  // El hash se calcula antes de entrar a la transacción para no mantenerla
  // abierta más de lo necesario.
  const { salt, hash } = await generarHash(datos.password);

  const usuario = await prisma.$transaction(async (tx) => {
    const totalUsuarios = await tx.usuario.count();
    if (totalUsuarios > 0) {
      throw new ErrorApi('YA_INICIALIZADO', 'Ya existe al menos un usuario registrado', 409);
    }

    // Invariante: el primer usuario siempre es admin, sin importar qué pida el payload
    // (este endpoint ni siquiera acepta un campo `rol`, pero lo dejamos explícito).
    return tx.usuario.create({
      data: { email: datos.email, nombre: datos.nombre, passwordHash: hash, salt, rol: 'admin' },
    });
  });

  return c.json(aUsuarioSesion(usuario), 201);
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const prisma = c.get('prisma');
  const { email, password } = c.req.valid('json');

  verificarLimiteIntentos(email);

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || usuario.deletedAt) {
    // Igual se hace un scrypt contra un hash ficticio: si el correo no existe
    // y respondemos de inmediato, el tiempo de respuesta delataría qué
    // correos sí están registrados.
    await simularVerificacionPassword(password);
    registrarIntentoFallido(email);
    throw new ErrorApi('CREDENCIALES_INVALIDAS', MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  const passwordValida = await verificarPassword(password, usuario.salt, usuario.passwordHash);
  if (!passwordValida || !usuario.activo) {
    registrarIntentoFallido(email);
    throw new ErrorApi('CREDENCIALES_INVALIDAS', MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  limpiarIntentosFallidos(email);

  const token = await prisma.$transaction(async (tx) => {
    await limpiarSesionesExpiradas(tx, usuario.id);
    return crearSesion(tx, usuario.id);
  });

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });

  return c.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
});

// ─────────────────────────────────────────────────────────
// Protegidas (el middleware de sesión ya puso `usuario` en el contexto)
// ─────────────────────────────────────────────────────────

authRoutes.post('/logout', async (c) => {
  const prisma = c.get('prisma');
  const token = obtenerToken(c);
  if (token) {
    await invalidarSesion(prisma, token);
  }
  return c.body(null, 204);
});

authRoutes.get('/yo', async (c) => {
  return c.json(c.get('usuario'));
});

const actualizarYoSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre no puede quedar vacío').optional(),
    email: z.string().email('Email inválido').optional(),
  })
  .refine((datos) => datos.nombre !== undefined || datos.email !== undefined, {
    message: 'Debes incluir al menos nombre o email',
  });

authRoutes.patch('/yo', zValidator('json', actualizarYoSchema), async (c) => {
  const prisma = c.get('prisma');
  const sesionUsuario = c.get('usuario');
  const datos = c.req.valid('json');

  if (datos.email) {
    const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
    if (existente && existente.id !== sesionUsuario.id) {
      throw new ErrorApi('EMAIL_EN_USO', 'Ya existe otro usuario con ese email', 409);
    }
  }

  const actualizado = await prisma.usuario.update({
    where: { id: sesionUsuario.id },
    data: { ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}), ...(datos.email !== undefined ? { email: datos.email } : {}) },
  });

  return c.json(aUsuarioSesion(actualizado));
});

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
  passwordNueva: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres'),
});

authRoutes.post('/yo/password', zValidator('json', cambiarPasswordSchema), async (c) => {
  const prisma = c.get('prisma');
  const sesionUsuario = c.get('usuario');
  const { passwordActual, passwordNueva } = c.req.valid('json');

  const usuario = await prisma.usuario.findUnique({ where: { id: sesionUsuario.id } });
  if (!usuario) throw new NoEncontradoError('Usuario');

  const passwordValida = await verificarPassword(passwordActual, usuario.salt, usuario.passwordHash);
  if (!passwordValida) {
    throw new ErrorApi('PASSWORD_INCORRECTA', 'La contraseña actual no es correcta', 401);
  }

  const { salt, hash } = await generarHash(passwordNueva);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash: hash, salt } });

  // Cambiar la contraseña invalida todas las demás sesiones del usuario; la
  // sesión que hizo el cambio se conserva para no desloguear a quien acaba
  // de autenticarse con la contraseña actual.
  const tokenActual = obtenerToken(c);
  await invalidarOtrasSesiones(prisma, usuario.id, tokenActual ? hashearToken(tokenActual) : undefined);

  return c.body(null, 204);
});
