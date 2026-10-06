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

/** Horas que debe tener el dato del mes en curso antes de volver a consultar a CFE. */
const HORAS_FRESCURA_TARIFAS = 24;

/**
 * Actualiza las tarifas CFE sin bloquear el arranque.
 *
 * Nunca lanza: si no hay internet, si CFE cambió el HTML o si el certificado
 * rotó, la app sigue funcionando con lo que ya tenga en SQLite. Ese es el
 * requisito: las cotizaciones deben poder hacerse sin conexión.
 */
async function sincronizarTarifasCfeEnSegundoPlano(): Promise<void> {
  try {
    const ahora = new Date();
    const { _max } = await prisma.cfeTariffRate.aggregate({
      _max: { fetchedAt: true },
      where: { year: ahora.getFullYear(), month: ahora.getMonth() + 1 },
    });

    const ultima = _max.fetchedAt;
    if (ultima && ahora.getTime() - ultima.getTime() < HORAS_FRESCURA_TARIFAS * 3_600_000) {
      return; // Ya está fresco: no golpeamos el sitio de CFE en cada reinicio.
    }

    const { syncCfeRates } = await import('./servicios/cfeRates.ts');
    const r = await syncCfeRates(prisma);
    console.log(
      `Tarifas CFE sincronizadas: ${r.saved} escalones, ${r.dacSaved} cuotas DAC, ` +
        `${r.missing} sin publicar, ${r.errors} con error (${Math.round(r.durationMs / 1000)}s)`
    );
  } catch (error) {
    console.warn(
      'No se pudieron sincronizar las tarifas CFE; se continúa con lo ya guardado:',
      error instanceof Error ? error.message : error
    );
  }
}

const servidor = serve({ fetch: app.fetch, hostname: '127.0.0.1', port }, (info) => {
  console.log(`Cotizador Solar backend escuchando en http://127.0.0.1:${info.port}`);
});

// Sincronización de tarifas CFE en segundo plano. Deliberadamente sin `await`:
// la app es offline-first y el arranque nunca puede depender de la red.
void sincronizarTarifasCfeEnSegundoPlano();

process.on('SIGINT', () => {
  servidor.close();
  process.exit(0);
});
