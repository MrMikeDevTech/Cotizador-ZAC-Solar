import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { VariablesApp } from './tipos.ts';
import { ErrorApi } from './errores.ts';
import { middlewareSesion } from './middleware/sesion.ts';
import { authRoutes } from './routes/auth.ts';
import { configRoutes } from './routes/config.ts';
import { contactosRoutes } from './routes/contactos.ts';
import { proyectosRoutes } from './routes/proyectos.ts';
import { cotizacionesRoutes } from './routes/cotizaciones.ts';
import { tareasRoutes } from './routes/tareas.ts';
import { documentosRoutes } from './routes/documentos.ts';
import { saludRoutes } from './routes/salud.ts';
import { cfeRatesRoutes } from './routes/cfeRates.ts';
import { funnelRoutes } from './routes/funnel.ts';
import { usuariosRoutes } from './routes/usuarios.ts';
import { agendaRoutes } from './routes/agenda.ts';
import { reportesRoutes } from './routes/reportes.ts';

const ORIGENES_PERMITIDOS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'null'];

/**
 * Fábrica de la app: recibe el cliente Prisma ya conectado a la DB correcta
 * (dev.db en local, userData/cotizador.db dentro de Electron empaquetado).
 * La misma app corre bajo @hono/node-server tanto en dev como en producción.
 */
export function crearApp(prisma: PrismaClient) {
  const app = new Hono<{ Variables: VariablesApp }>();

  app.use(
    '*',
    cors({
      origin: (origin) => (origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0]!),
    })
  );

  app.use('*', async (c, next) => {
    c.set('prisma', prisma);
    await next();
  });

  app.use('*', middlewareSesion);

  app.onError((err, c) => {
    if (err instanceof ErrorApi) {
      return c.json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } }, err.status as any);
    }
    if (err instanceof ZodError) {
      return c.json(
        { error: { codigo: 'VALIDACION', mensaje: 'Datos inválidos', detalles: err.issues } },
        400
      );
    }
    console.error(err);
    return c.json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' } }, 500);
  });

  app.route('/api/health', saludRoutes);
  app.route('/api/auth', authRoutes);
  app.route('/api/config', configRoutes);
  app.route('/api/contactos', contactosRoutes);
  app.route('/api/proyectos', proyectosRoutes);
  app.route('/api/cotizacion', cotizacionesRoutes);
  app.route('/api/tareas', tareasRoutes);
  app.route('/api/documentos', documentosRoutes);
  app.route('/api/cfe-rates', cfeRatesRoutes);
  app.route('/api/funnel', funnelRoutes);
  app.route('/api/usuarios', usuariosRoutes);
  app.route('/api/agenda', agendaRoutes);
  app.route('/api/reportes', reportesRoutes);

  return app;
}

export type App = ReturnType<typeof crearApp>;
