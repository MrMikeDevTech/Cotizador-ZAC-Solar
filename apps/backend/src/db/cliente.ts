import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let cliente: PrismaClient | undefined;

/** Cliente Prisma singleton. La URL apunta al mismo archivo que usa el migrador/seed. */
export function crearClientePrisma(dbPath: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export function obtenerClientePrisma(dbPath: string): PrismaClient {
  if (!cliente) {
    cliente = crearClientePrisma(dbPath);
  }
  return cliente;
}

export async function cerrarClientePrisma(): Promise<void> {
  if (cliente) {
    await cliente.$disconnect();
    cliente = undefined;
  }
}
