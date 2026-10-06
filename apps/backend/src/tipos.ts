import type { PrismaClient } from './generated/prisma/client.ts';

/** Usuario autenticado disponible en el contexto de la petición. Nunca incluye `passwordHash` ni `salt`. */
export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariablesApp {
  prisma: PrismaClient;
  usuario: UsuarioSesion;
}
