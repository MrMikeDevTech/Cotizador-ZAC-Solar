-- Campos que necesita el PDF de cotización y que no existían en el modelo.
--
-- Todos llevan DEFAULT '' (o 'Contado') y NOT NULL para que las filas ya
-- existentes queden válidas sin reescribir la tabla: SQLite rellena el valor
-- por defecto en las filas actuales al añadir la columna. Por eso se usa
-- ADD COLUMN y no el rebuild de tabla que genera el CLI de Prisma, que en
-- este proyecto ya provocó una pérdida de datos al omitir una columna NOT
-- NULL en el INSERT (ver la migración de auth/funnel/agenda).

-- Método de pago: parte de la oferta, por eso vive en la cotización
-- (instantánea versionada) y no en el proyecto.
ALTER TABLE "Cotizacion" ADD COLUMN "metodoPago" TEXT NOT NULL DEFAULT 'Contado';

-- Formato del documento: identidad del vendedor y textos fijos del PDF.
ALTER TABLE "Empresa" ADD COLUMN "tituloCotizacion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Empresa" ADD COLUMN "introPlantilla" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Empresa" ADD COLUMN "observaciones" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Empresa" ADD COLUMN "firmaNombre" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Empresa" ADD COLUMN "firmaPuesto" TEXT NOT NULL DEFAULT '';
