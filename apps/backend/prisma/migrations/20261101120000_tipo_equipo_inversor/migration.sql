-- Tipo de equipo inversor de la cotizacion: "Inversor" o "Microinversor".
--
-- Hasta ahora el documento no podia distinguirlos y la tabla de garantias del PDF
-- decia "Inversor o microinversor". Se guarda en la cotizacion (como el resto del
-- snapshot del equipo) y no en el catalogo: depende de lo que se vende en esa obra.
-- Las cotizaciones anteriores quedan como "Inversor", que era lo que asumian.
ALTER TABLE "Cotizacion" ADD COLUMN "tipoEquipoInversor" TEXT NOT NULL DEFAULT 'Inversor';
