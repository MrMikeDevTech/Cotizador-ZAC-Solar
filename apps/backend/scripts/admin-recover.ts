#!/usr/bin/env node
/**
 * CLI de emergencia para recuperar acceso de administrador.
 *
 * Es seguro exponer esto como un script de consola porque requiere acceso al
 * sistema de archivos de la máquina donde corre el backend (lee/escribe
 * directamente el archivo SQLite vía `DATABASE_URL`, igual que `src/server.ts`).
 * Esa es la frontera de confianza correcta en una app de escritorio de un solo
 * usuario: quien puede ejecutar este script ya podría, de todos modos, copiar
 * el archivo `.db` o reinstalar la app. No se expone nada de esto por HTTP.
 *
 * Uso:
 *   bun run admin:recover
 *     -> lista los usuarios y cuántos admins activos hay.
 *
 *   bun run admin:recover -- --email correo@ejemplo.com --password nuevaClave123
 *     -> si el usuario existe: lo promueve a admin y lo reactiva.
 *        si no existe: lo crea como admin con esa contraseña.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutarMigraciones } from '../src/db/migrador.ts';
import { crearClientePrisma } from '../src/db/cliente.ts';
import { generarHash } from '../src/servicios/auth.ts';
import { contarAdminsActivos } from '../src/servicios/auth.ts';

try {
  process.loadEnvFile();
} catch {
  // sin .env: se usa el default de abajo
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Misma resolución de ruta que `src/server.ts`: DATABASE_URL o `./dev.db` por defecto. */
function resolverRutaDb(): string {
  return process.env.DATABASE_URL?.replace(/^file:/, '') ?? join(__dirname, '..', 'dev.db');
}

function parsearArgumentos(argv: string[]): { email?: string; password?: string } {
  const resultado: { email?: string; password?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') resultado.email = argv[++i];
    if (argv[i] === '--password') resultado.password = argv[++i];
  }
  return resultado;
}

async function listarUsuarios(prisma: Awaited<ReturnType<typeof crearClientePrisma>>): Promise<void> {
  const usuarios = await prisma.usuario.findMany({ orderBy: { createdAt: 'asc' } });
  const admins = await contarAdminsActivos(prisma);

  console.log(`Usuarios registrados: ${usuarios.length}`);
  console.log(`Administradores activos: ${admins}`);
  console.log('');

  for (const u of usuarios) {
    const estado = u.deletedAt ? 'borrado' : u.activo ? 'activo' : 'inactivo';
    console.log(`- ${u.email}  (${u.nombre})  rol=${u.rol}  estado=${estado}`);
  }

  if (admins === 0) {
    console.log('');
    console.log('No hay ningún administrador activo. Usa:');
    console.log('  bun run admin:recover -- --email <correo> --password <clave>');
  }
}

async function recuperarAdmin(
  prisma: Awaited<ReturnType<typeof crearClientePrisma>>,
  email: string,
  password: string
): Promise<void> {
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  const { salt, hash } = await generarHash(password);
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: { rol: 'admin', activo: true, deletedAt: null, passwordHash: hash, salt },
    });
    console.log(`Usuario ${email} promovido a admin, reactivado y con contraseña actualizada.`);
  } else {
    await prisma.usuario.create({
      data: { email, nombre: email, passwordHash: hash, salt, rol: 'admin' },
    });
    console.log(`Usuario admin ${email} creado.`);
  }
}

async function main(): Promise<void> {
  const dbPath = resolverRutaDb();
  ejecutarMigraciones(dbPath);
  const prisma = crearClientePrisma(dbPath);

  try {
    const { email, password } = parsearArgumentos(process.argv.slice(2));

    if (email && password) {
      await recuperarAdmin(prisma, email, password);
    } else if (email || password) {
      console.error('Debes pasar --email y --password juntos.');
      process.exitCode = 1;
    } else {
      await listarUsuarios(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
