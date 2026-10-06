import type { PrismaClient } from '../generated/prisma/client.ts';
import { generarHash, crearSesion } from '../servicios/auth.ts';

/**
 * Crea un usuario admin con una sesión ya activa, para usar en `before()` de
 * los tests de rutas que ya no son públicas desde que se agregó el
 * middleware de sesión. Evita repetir el login en cada test: se llama una
 * sola vez y el header resultante se reutiliza en todas las peticiones del
 * archivo.
 */
export async function crearAdminConSesion(
  prisma: PrismaClient,
  overrides: { email?: string; nombre?: string; password?: string } = {}
): Promise<{ token: string; headers: Record<string, string>; usuarioId: string }> {
  const email = overrides.email ?? 'admin-test@zacsolar.mx';
  const nombre = overrides.nombre ?? 'Admin de prueba';
  const password = overrides.password ?? 'clave-de-prueba-123';

  const { salt, hash } = await generarHash(password);
  const usuario = await prisma.usuario.create({
    data: { email, nombre, passwordHash: hash, salt, rol: 'admin' },
  });
  const token = await crearSesion(prisma, usuario.id);

  return { token, headers: { Authorization: `Bearer ${token}` }, usuarioId: usuario.id };
}
