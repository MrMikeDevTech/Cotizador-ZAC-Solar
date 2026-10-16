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

/**
 * Orígenes locales, con **cualquier** puerto. Dentro del Electron empaquetado
 * el renderer y la API escuchan en puertos efímeros distintos (`port: 0`), así
 * que fijar el 3000 de desarrollo dejaba fuera a la app instalada: el navegador
 * bloqueaba todas las respuestas y ni el alta del primer administrador
 * funcionaba.
 *
 * Es seguro aceptar cualquier puerto local porque el servidor sólo escucha en
 * 127.0.0.1 (inalcanzable desde fuera del equipo) y la sesión viaja en un
 * header `Authorization`, no en cookies: una página externa no puede adjuntarlo.
 * Un origen remoto sigue siendo rechazado.
 */
const PATRON_ORIGEN_LOCAL = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

/** `'null'` es el origen que manda un documento cargado con `file://`. */
const ORIGEN_SIN_ORIGEN = 'null';

function esOrigenPermitido(origin: string): boolean {
  return origin === ORIGEN_SIN_ORIGEN || PATRON_ORIGEN_LOCAL.test(origin);
}

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
      // Devolver `null` cuando el origen no está permitido hace que Hono omita
      // el header `Access-Control-Allow-Origin` y el navegador bloquee la
      // respuesta, que es lo que queremos para un origen remoto.
      origin: (origin) => (origin && esOrigenPermitido(origin) ? origin : null),
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
