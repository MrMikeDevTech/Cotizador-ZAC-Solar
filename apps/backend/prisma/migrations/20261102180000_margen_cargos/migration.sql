-- Los cargos adicionales ahora llevan margen como cualquier concepto.
ALTER TABLE "CotizacionCargo" ADD COLUMN "margenPorcentaje" REAL NOT NULL DEFAULT 0;
