-- Observaciones por cotización.
--
-- Las de `Empresa` siguen siendo el valor por defecto configurable, pero el
-- tiempo de instalación o la vigencia cambian de una obra a otra, así que
-- tienen que poder ajustarse al cotizar. Vacío = se usan las de la empresa.
ALTER TABLE "Cotizacion" ADD COLUMN "observaciones" TEXT NOT NULL DEFAULT '';
