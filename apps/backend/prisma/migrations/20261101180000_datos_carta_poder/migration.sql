-- Datos del domicilio y medidor del recibo CFE, para la Carta Poder.
ALTER TABLE "Proyecto" ADD COLUMN "direccion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proyecto" ADD COLUMN "codigoPostal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proyecto" ADD COLUMN "numeroMedidor" TEXT NOT NULL DEFAULT '';
