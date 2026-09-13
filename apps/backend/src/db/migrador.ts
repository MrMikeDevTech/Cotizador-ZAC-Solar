import Database from 'better-sqlite3';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * `prisma migrate deploy` requiere el CLI de Prisma, que no viaja dentro de un
 * Electron empaquetado. Este runner aplica los mismos migration.sql generados
 * por Prisma directamente con better-sqlite3, sin depender del CLI en producción.
 */
export function ejecutarMigraciones(dbPath: string, migrationsDir?: string): void {
  const carpetaMigraciones = migrationsDir ?? join(__dirname, '..', '..', 'prisma', 'migrations');
  const db = new Database(dbPath);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migraciones_aplicadas (
        nombre TEXT PRIMARY KEY,
        aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    if (!existsSync(carpetaMigraciones)) {
      return;
    }

    const carpetas = readdirSync(carpetaMigraciones, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    const aplicadas = new Set(
      db.prepare('SELECT nombre FROM _migraciones_aplicadas').all().map((r: any) => r.nombre)
    );

    const marcarAplicada = db.prepare(
      'INSERT INTO _migraciones_aplicadas (nombre) VALUES (?)'
    );

    for (const carpeta of carpetas) {
      if (aplicadas.has(carpeta)) continue;

      const sqlPath = join(carpetaMigraciones, carpeta, 'migration.sql');
      if (!existsSync(sqlPath)) continue;

      const sql = readFileSync(sqlPath, 'utf-8');

      const aplicar = db.transaction(() => {
        db.exec(sql);
        marcarAplicada.run(carpeta);
      });
      aplicar();
    }
  } finally {
    db.close();
  }
}
