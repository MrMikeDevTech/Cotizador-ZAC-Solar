import type { PrismaClient } from './generated/prisma/client.ts';
import type { RenderizadorPdf } from './servicios/renderPdf.ts';

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

/**
 * Cómo generar PDFs. Se inyecta al crear la app porque depende del entorno:
 * Electron aporta su propio Chromium, el backend en desarrollo usa el del
 * sistema, y los tests no aportan ninguno (`pdf: null`), con lo que el
 * endpoint responde 503 en vez de intentar arrancar un navegador.
 */
export interface OpcionesPdf {
  renderizar: RenderizadorPdf;
  /**
   * URL base del renderer. Es un getter y no un string porque dentro de
   * Electron la app de la API se crea antes de que el servidor del renderer
   * tenga puerto asignado (`port: 0`).
   */
  rendererBaseUrl: () => string;
}

export interface VariablesApp {
  prisma: PrismaClient;
  usuario: UsuarioSesion;
  pdf: OpcionesPdf | null;
}
