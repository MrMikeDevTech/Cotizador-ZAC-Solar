import type { MiddlewareHandler } from 'hono';
import type { VariablesApp } from '../tipos.ts';
import { validarSesion } from '../servicios/auth.ts';
import { ErrorApi } from '../errores.ts';

/**
 * Rutas de `/api/*` que no requieren sesión: el estado de inicialización, la
 * creación del primer admin y el propio login (si ya se exigiera sesión para
 * loguearse, nadie podría loguearse nunca). `/api/health` también es público
 * porque lo usa el frontend para saber si el backend ya levantó, antes de
 * saber si hay sesión.
 */
const RUTAS_PUBLICAS = new Set(['/api/health', '/api/auth/estado', '/api/auth/primer-admin', '/api/auth/login']);

/**
 * Middleware de sesión: lee `Authorization: Bearer <token>`, lo valida contra
 * la tabla `Sesion` y deja el usuario (sin `passwordHash` ni `salt`) en el
 * contexto bajo `usuario`. Se registra para todas las rutas `/api/*` salvo
 * las de `RUTAS_PUBLICAS`.
 */
export const middlewareSesion: MiddlewareHandler<{ Variables: VariablesApp }> = async (c, next) => {
  if (!c.req.path.startsWith('/api/') || RUTAS_PUBLICAS.has(c.req.path)) {
    return next();
  }

  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;

  if (!token) {
    throw new ErrorApi('NO_AUTENTICADO', 'Se requiere iniciar sesión', 401);
  }

  const prisma = c.get('prisma');
  const usuario = await validarSesion(prisma, token);
  if (!usuario) {
    throw new ErrorApi('NO_AUTENTICADO', 'Sesión inválida o expirada', 401);
  }

  c.set('usuario', usuario);
  await next();
};
