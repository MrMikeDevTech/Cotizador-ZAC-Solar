-- Añade sesión/usuarios, fases del funnel y agenda; y sustituye el campo
-- `Proyecto.estatus` (string libre) por una FK a `FunnelFase`.
--
-- Esta migración se escribió a mano: el SQL que genera `prisma migrate diff`
-- reconstruye `Proyecto` sin incluir `faseId` en el INSERT, y como esa columna
-- es NOT NULL sin default, cualquier proyecto existente rompería la migración.
-- Aquí se siembran primero las fases y luego se mapea `estatus` -> `faseId`.

-- AlterTable
ALTER TABLE "Localidad" ADD COLUMN "mesInicioVerano" INTEGER;
ALTER TABLE "Localidad" ADD COLUMN "regionDac" TEXT;

-- CreateTable
-- DAC no se publica por escalones de consumo sino por región: cargo fijo mensual
-- más precio plano por kWh. Por eso no cabe en CfeTariffRate.
CREATE TABLE "CfeDacRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "cargoFijo" REAL NOT NULL,
    "precioKwh" REAL NOT NULL,
    "precioKwhVerano" REAL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEn" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FunnelFase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#00388d',
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "EventoAgenda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME,
    "todoElDia" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL DEFAULT 'evento',
    "proyectoId" TEXT,
    "contactoId" TEXT,
    "usuarioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- Siembra de las 5 fases de sistema. Ids deterministas para que el mapeo de
-- abajo y el seed de la aplicación coincidan sin depender de UUIDs generados.
INSERT INTO "FunnelFase" ("id", "nombre", "slug", "orden", "color", "esSistema", "updatedAt") VALUES
    ('fase-borrador', 'Borrador',  'borrador', 0, '#94a3b8', true, CURRENT_TIMESTAMP),
    ('fase-cotizado', 'Cotizado',  'cotizado', 1, '#00388d', true, CURRENT_TIMESTAMP),
    ('fase-enviado',  'Enviado',   'enviado',  2, '#f7931e', true, CURRENT_TIMESTAMP),
    ('fase-vendido',  'Vendido',   'vendido',  3, '#8cc63f', true, CURRENT_TIMESTAMP),
    ('fase-perdido',  'Perdido',   'perdido',  4, '#ef4444', true, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Proyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidadConsumo" TEXT NOT NULL DEFAULT '',
    "hilos" TEXT NOT NULL DEFAULT '1 hilo',
    "nombreRecibo" TEXT NOT NULL DEFAULT '',
    "numeroServicio" TEXT NOT NULL DEFAULT '',
    "tarifa" TEXT NOT NULL DEFAULT '1A',
    "usarNuevaTarifa" BOOLEAN NOT NULL DEFAULT false,
    "ivaCfe" REAL NOT NULL DEFAULT 16,
    "aplicarDac" BOOLEAN NOT NULL DEFAULT false,
    "aplicarDap" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeDap" TEXT NOT NULL DEFAULT '',
    "periodo" TEXT NOT NULL DEFAULT 'Bimestral',
    "fechaInicio" TEXT NOT NULL DEFAULT '',
    "faseId" TEXT NOT NULL,
    "ordenEnFase" INTEGER NOT NULL DEFAULT 0,
    "pasoActual" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Proyecto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Proyecto_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "FunnelFase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Mapea el `estatus` anterior a su fase. Cualquier valor no reconocido cae en
-- 'borrador' en vez de perder la fila.
INSERT INTO "new_Proyecto" (
    "aplicarDac", "aplicarDap", "codigo", "contactoId", "createdAt", "deletedAt",
    "fechaInicio", "hilos", "id", "ivaCfe", "localidadConsumo", "nombre",
    "nombreRecibo", "numeroServicio", "pasoActual", "periodo", "porcentajeDap",
    "tarifa", "updatedAt", "usarNuevaTarifa", "faseId", "ordenEnFase"
)
SELECT
    "aplicarDac", "aplicarDap", "codigo", "contactoId", "createdAt", "deletedAt",
    "fechaInicio", "hilos", "id", "ivaCfe", "localidadConsumo", "nombre",
    "nombreRecibo", "numeroServicio", "pasoActual", "periodo", "porcentajeDap",
    "tarifa", "updatedAt", "usarNuevaTarifa",
    CASE "estatus"
        WHEN 'cotizado' THEN 'fase-cotizado'
        WHEN 'enviado'  THEN 'fase-enviado'
        WHEN 'vendido'  THEN 'fase-vendido'
        WHEN 'perdido'  THEN 'fase-perdido'
        ELSE 'fase-borrador'
    END,
    0
FROM "Proyecto";

DROP TABLE "Proyecto";
ALTER TABLE "new_Proyecto" RENAME TO "Proyecto";
CREATE UNIQUE INDEX "Proyecto_codigo_key" ON "Proyecto"("codigo");
CREATE INDEX "Proyecto_faseId_ordenEnFase_idx" ON "Proyecto"("faseId", "ordenEnFase");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_activo_idx" ON "Usuario"("rol", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_tokenHash_key" ON "Sesion"("tokenHash");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE INDEX "Sesion_expiraEn_idx" ON "Sesion"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelFase_slug_key" ON "FunnelFase"("slug");

-- CreateIndex
CREATE INDEX "EventoAgenda_inicio_idx" ON "EventoAgenda"("inicio");

-- CreateIndex
CREATE UNIQUE INDEX "CfeDacRate_year_month_region_key" ON "CfeDacRate"("year", "month", "region");

-- CreateIndex
CREATE INDEX "CfeDacRate_year_month_idx" ON "CfeDacRate"("year", "month");
