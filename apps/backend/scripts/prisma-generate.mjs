/**
 * Envoltorio de `prisma generate` que lo hace funcionar en NixOS.
 *
 * El CLI de Prisma resuelve sus engines antes de cualquier comando, y para
 * NixOS no hay binarios precompilados: la descarga devuelve 404 y `generate`
 * aborta —aunque no necesite el engine para nada—. El resultado era que un
 * simple `bun install` terminaba con un error alarmante y `db:generate`
 * quedaba inutilizable.
 *
 * `generate` sólo **comprueba que la ruta exista**; nunca ejecuta el binario
 * (verificado: apuntándolo a un archivo cualquiera, genera el cliente sin
 * tocar la red). Así que basta con darle una ruta resoluble.
 *
 * Importante: esto vale para `generate` y nada más. `prisma migrate` sí
 * ejecuta el schema-engine de verdad, y para eso hace falta el binario
 * estático real (ver README). Por eso el atajo se aplica aquí y no en
 * prisma.config.ts, que afectaría a todos los comandos.
 *
 * En cualquier otro sistema el script no cambia nada: delega en el CLI tal cual.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const entorno = { ...process.env };

// Entrada JS del CLI. Se invoca con el Node actual en vez del ejecutable
// `prisma` de node_modules/.bin: ese shim es un `.CMD` en Windows y
// `spawnSync` sin shell no lo encontraría.
const cliPrisma = require.resolve('prisma/build/index.js');

/** NixOS no publica engines precompilados; `/etc/NIXOS` es su marcador canónico. */
const esNixOS = existsSync('/etc/NIXOS');

if (esNixOS && !entorno.PRISMA_SCHEMA_ENGINE_BINARY) {
  // Cualquier archivo existente sirve: `generate` sólo valida la ruta. Se
  // reutiliza el propio CLI para no crear un archivo de relleno.
  entorno.PRISMA_SCHEMA_ENGINE_BINARY = cliPrisma;
  console.log('NixOS detectado: se omite la descarga del schema-engine (generate no lo ejecuta).');
}

const resultado = spawnSync(process.execPath, [cliPrisma, 'generate'], {
  stdio: 'inherit',
  env: entorno,
  shell: false,
});

if (resultado.error) {
  console.error('No se pudo ejecutar `prisma generate`:', resultado.error.message);
  process.exit(1);
}

process.exit(resultado.status ?? 1);
