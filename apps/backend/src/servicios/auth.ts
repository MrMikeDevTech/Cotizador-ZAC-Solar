import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { PrismaClient, Prisma } from '../generated/prisma/client.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import type { UsuarioSesion } from '../tipos.ts';

const scryptAsync = promisify(scrypt);

/** Cliente o transacción Prisma: todo lo de aquí funciona dentro o fuera de un `$transaction`. */
type Cliente = PrismaClient | Prisma.TransactionClient;

/** Forma completa de la fila `Usuario`, tal como la devuelve Prisma sin `select`. */
interface FilaUsuario {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  salt: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const LARGO_CLAVE_SCRYPT = 64;
/** Vigencia de una sesión: 30 días. */
export const SESION_DURACION_MS = 30 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────
// Hashing de contraseñas
// ─────────────────────────────────────────────────────────

/**
 * Genera salt + hash para una contraseña nueva. Usa scrypt asíncrono
 * (nunca `scryptSync`, que bloquearía el event loop del servidor).
 */
export async function generarHash(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16).toString('hex');
  const derivado = (await scryptAsync(password, salt, LARGO_CLAVE_SCRYPT)) as Buffer;
  return { salt, hash: derivado.toString('hex') };
}

/** Compara una contraseña contra su hash guardado, siempre con `timingSafeEqual`. */
export async function verificarPassword(password: string, salt: string, hashEsperado: string): Promise<boolean> {
  const derivado = (await scryptAsync(password, salt, LARGO_CLAVE_SCRYPT)) as Buffer;
  const esperado = Buffer.from(hashEsperado, 'hex');
  if (derivado.length !== esperado.length) return false;
  return timingSafeEqual(derivado, esperado);
}

// Salt/hash ficticios fijos (generados una sola vez, de forma perezosa) para que
// verificar un email inexistente cueste el mismo tiempo que verificar uno real:
// de otro modo, la ausencia del scrypt filtraría por timing qué correos existen.
let credencialesFicticias: { salt: string; hash: string } | undefined;

async function obtenerCredencialesFicticias(): Promise<{ salt: string; hash: string }> {
  if (!credencialesFicticias) {
    credencialesFicticias = await generarHash('contraseña-ficticia-para-comparacion-de-tiempo');
  }
  return credencialesFicticias;
}

/** Ejecuta un scrypt "de relleno" cuando el email no existe, para no filtrar por tiempo qué correos están registrados. */
export async function simularVerificacionPassword(password: string): Promise<void> {
  const { salt, hash } = await obtenerCredencialesFicticias();
  await verificarPassword(password, salt, hash);
}

// ─────────────────────────────────────────────────────────
// Tokens de sesión
// ─────────────────────────────────────────────────────────

/** Token de sesión: 32 bytes aleatorios en hex. Se entrega al cliente una sola vez. */
export function generarToken(): string {
  return randomBytes(32).toString('hex');
}

/** Lo único que se guarda en la DB. Si alguien lee el SQLite no obtiene un token usable. */
export function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function aUsuarioSesion(usuario: FilaUsuario): UsuarioSesion {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    activo: usuario.activo,
    ultimoAcceso: usuario.ultimoAcceso,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
}

export { aUsuarioSesion };

/** Limpieza barata de las sesiones ya vencidas de un usuario. Se corre en cada login. */
export async function limpiarSesionesExpiradas(tx: Cliente, usuarioId: string): Promise<void> {
  await tx.sesion.deleteMany({ where: { usuarioId, expiraEn: { lt: new Date() } } });
}

/** Crea una sesión y devuelve el token en claro (única vez que existe fuera de la DB). */
export async function crearSesion(tx: Cliente, usuarioId: string): Promise<string> {
  const token = generarToken();
  await tx.sesion.create({
    data: {
      tokenHash: hashearToken(token),
      usuarioId,
      expiraEn: new Date(Date.now() + SESION_DURACION_MS),
    },
  });
  return token;
}

/**
 * Valida un token de sesión. Si la sesión expiró la borra y rechaza. Si el
 * usuario fue desactivado o borrado también rechaza, aunque el token siga
 * siendo técnicamente válido.
 */
export async function validarSesion(tx: Cliente, token: string): Promise<UsuarioSesion | null> {
  const tokenHash = hashearToken(token);
  const sesion = await tx.sesion.findUnique({ where: { tokenHash } });
  if (!sesion) return null;

  if (sesion.expiraEn.getTime() < Date.now()) {
    await tx.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
    return null;
  }

  const usuario = await tx.usuario.findUnique({ where: { id: sesion.usuarioId } });
  if (!usuario || usuario.deletedAt || !usuario.activo) return null;

  return aUsuarioSesion(usuario);
}

/** Borra la sesión asociada a un token (logout). */
export async function invalidarSesion(tx: Cliente, token: string): Promise<void> {
  await tx.sesion.deleteMany({ where: { tokenHash: hashearToken(token) } });
}

/** Borra todas las sesiones de un usuario salvo, opcionalmente, la actual (cambio de contraseña). */
export async function invalidarOtrasSesiones(tx: Cliente, usuarioId: string, tokenHashActual?: string): Promise<void> {
  await tx.sesion.deleteMany({
    where: { usuarioId, ...(tokenHashActual ? { tokenHash: { not: tokenHashActual } } : {}) },
  });
}

// ─────────────────────────────────────────────────────────
// Invariantes de administrador — núcleo de las reglas, nunca repartidas
// por los handlers de rutas.
// ─────────────────────────────────────────────────────────

/** Cuenta administradores activos (no borrados). `excluirId` sirve para simular "qué pasaría si X dejara de serlo". */
export async function contarAdminsActivos(tx: Cliente, excluirId?: string): Promise<number> {
  return tx.usuario.count({
    where: {
      rol: 'admin',
      activo: true,
      deletedAt: null,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
  });
}

/**
 * Rechaza cualquier operación que dejaría el sistema sin administradores
 * activos. Cubre los tres casos del mismo modo: desactivar, borrar o
 * degradar al último admin activo todos equivalen a "este usuario deja de
 * contar como admin activo", así que basta con una sola comprobación.
 */
export async function asegurarNoUltimoAdminActivo(tx: Cliente, usuarioId: string, accion: string): Promise<void> {
  const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new NoEncontradoError('Usuario');

  const esAdminActivoHoy = usuario.rol === 'admin' && usuario.activo && !usuario.deletedAt;
  if (!esAdminActivoHoy) return; // la operación no le quita nada a un admin activo

  const otrosAdminsActivos = await contarAdminsActivos(tx, usuarioId);
  if (otrosAdminsActivos === 0) {
    throw new ErrorApi(
      'ULTIMO_ADMIN',
      `No se puede ${accion}: el sistema se quedaría sin administradores activos`,
      409
    );
  }
}

/** Un usuario no puede desactivarse ni borrarse a sí mismo. */
export function asegurarNoAutoaccion(solicitanteId: string, objetivoId: string, accion: string): void {
  if (solicitanteId === objetivoId) {
    throw new ErrorApi('AUTOACCION_NO_PERMITIDA', `No puedes ${accion} tu propia cuenta`, 400);
  }
}

/** Solo un admin puede asignar o quitar el rol admin a otro usuario. */
export function asegurarSoloAdminCambiaRol(solicitante: UsuarioSesion, rolActual: string, rolNuevo: string): void {
  if (rolActual === rolNuevo) return;
  if (solicitante.rol !== 'admin') {
    throw new ErrorApi('PERMISO_DENEGADO', 'Solo un administrador puede asignar o quitar el rol de administrador', 403);
  }
}

/** Desactiva un usuario, respetando las invariantes de administrador y de autoacción. */
export async function desactivarUsuario(tx: Cliente, usuarioId: string, solicitanteId: string): Promise<UsuarioSesion> {
  asegurarNoAutoaccion(solicitanteId, usuarioId, 'desactivar');
  await asegurarNoUltimoAdminActivo(tx, usuarioId, 'desactivar a este usuario');
  const usuario = await tx.usuario.update({ where: { id: usuarioId }, data: { activo: false } });
  return aUsuarioSesion(usuario);
}

/** Borra (soft delete) un usuario, respetando las invariantes de administrador y de autoacción. */
export async function borrarUsuario(tx: Cliente, usuarioId: string, solicitanteId: string): Promise<void> {
  asegurarNoAutoaccion(solicitanteId, usuarioId, 'borrar');
  await asegurarNoUltimoAdminActivo(tx, usuarioId, 'borrar a este usuario');
  await tx.usuario.update({ where: { id: usuarioId }, data: { deletedAt: new Date(), activo: false } });
}

/** Cambia el rol de un usuario, respetando quién puede tocar el rol admin y que nunca quede el sistema sin admins. */
export async function cambiarRolUsuario(
  tx: Cliente,
  usuarioId: string,
  rolNuevo: 'admin' | 'usuario',
  solicitante: UsuarioSesion
): Promise<UsuarioSesion> {
  const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.deletedAt) throw new NoEncontradoError('Usuario');

  asegurarSoloAdminCambiaRol(solicitante, usuario.rol, rolNuevo);
  if (rolNuevo !== 'admin') {
    await asegurarNoUltimoAdminActivo(tx, usuarioId, 'quitarle el rol de administrador a este usuario');
  }

  const actualizado = await tx.usuario.update({ where: { id: usuarioId }, data: { rol: rolNuevo } });
  return aUsuarioSesion(actualizado);
}

// ─────────────────────────────────────────────────────────
// Rate limit de login — Map en memoria, suficiente para una app de
// escritorio de un solo proceso.
// ─────────────────────────────────────────────────────────

const INTENTOS_MAXIMOS = 10;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;

interface RegistroIntentos {
  cantidad: number;
  desde: number;
}

const intentosFallidosPorEmail = new Map<string, RegistroIntentos>();

function registroVigente(email: string): RegistroIntentos | undefined {
  const registro = intentosFallidosPorEmail.get(email);
  if (!registro) return undefined;
  if (Date.now() - registro.desde > VENTANA_INTENTOS_MS) {
    intentosFallidosPorEmail.delete(email);
    return undefined;
  }
  return registro;
}

/** Máximo 10 intentos fallidos por email en 15 minutos. */
export function verificarLimiteIntentos(email: string): void {
  const registro = registroVigente(email);
  if (registro && registro.cantidad >= INTENTOS_MAXIMOS) {
    throw new ErrorApi('DEMASIADOS_INTENTOS', 'Demasiados intentos fallidos. Intenta de nuevo más tarde.', 429);
  }
}

export function registrarIntentoFallido(email: string): void {
  const registro = registroVigente(email);
  if (registro) {
    registro.cantidad += 1;
  } else {
    intentosFallidosPorEmail.set(email, { cantidad: 1, desde: Date.now() });
  }
}

/** Un intento exitoso limpia el contador de ese email. */
export function limpiarIntentosFallidos(email: string): void {
  intentosFallidosPorEmail.delete(email);
}
