import { serve } from '@hono/node-server';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile();
} catch {
  // sin .env (p.ej. dentro de Electron, donde DATABASE_URL se define en código)
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, '') ?? join(__dirname, '..', 'dev.db');
const port = Number(process.env.PORT) || 3001;

const { ejecutarMigraciones } = await import('./db/migrador.ts');
const { crearClientePrisma } = await import('./db/cliente.ts');
const { sembrarCatalogos } = await import('./db/seed.ts');
const { crearApp } = await import('./app.ts');

ejecutarMigraciones(dbPath);
const prisma = crearClientePrisma(dbPath);
await sembrarCatalogos(prisma);

const app = crearApp(prisma);

const servidor = serve({ fetch: app.fetch, hostname: '127.0.0.1', port }, (info) => {
  console.log(`Cotizador Solar backend escuchando en http://127.0.0.1:${info.port}`);
});

process.on('SIGINT', () => {
  servidor.close();
  process.exit(0);
});
