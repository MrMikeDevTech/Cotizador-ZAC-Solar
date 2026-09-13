import { Hono } from 'hono';
import type { VariablesApp } from '../tipos.ts';

export const saludRoutes = new Hono<{ Variables: VariablesApp }>();

saludRoutes.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    await prisma.empresa.count();
    return c.json({ estado: 'ok' });
  } catch {
    return c.json({ estado: 'error' }, 503);
  }
});
