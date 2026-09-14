import { defineConfig } from 'prisma/config';

// El cliente en tiempo de ejecución (apps/backend/src/db/cliente.ts) recibe su
// propia URL vía adapter y no depende de DATABASE_URL: en la app empaquetada,
// apps/desktop/electron/main.ts la fija dinámicamente apuntando a userData.
// Este valor solo lo usa el CLI de Prisma (generate/migrate) en desarrollo,
// así que un default evita depender de un .env para poder clonar y arrancar.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
});
