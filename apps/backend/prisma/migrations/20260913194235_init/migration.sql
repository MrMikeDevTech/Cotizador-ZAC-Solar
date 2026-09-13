-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT '1',
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL DEFAULT '',
    "localidad" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "descripcion" TEXT NOT NULL DEFAULT '',
    "rfc" TEXT,
    "logoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FactoresCalculo" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT '1',
    "factorProduccion" REAL NOT NULL,
    "pagoMinimoCfe" REAL NOT NULL,
    "ivaPorcentaje" REAL NOT NULL,
    "inflacionCfe" REAL NOT NULL,
    "factorCo2" REAL NOT NULL,
    "factorArboles" REAL NOT NULL,
    "factorKmAuto" REAL NOT NULL,
    "areaPorPanel" REAL NOT NULL,
    "factoresEstacionales" TEXT NOT NULL,
    "precioPanelDefault" REAL NOT NULL,
    "precioInversorDefault" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "watts" REAL NOT NULL,
    "factorBifacial" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Inversor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "wattsMax" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Estructura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ConceptoPlantilla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concepto" TEXT NOT NULL,
    "costoBase" REAL NOT NULL,
    "margenPorcentaje" REAL NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Tarifa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "limiteDac" INTEGER,
    "esNueva" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Localidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estado" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "factorProduccion" REAL NOT NULL,
    "horasSol" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlantillaDocumento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "referenciaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL DEFAULT '',
    "apellidoMaterno" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "celular" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT '',
    "localidad" TEXT NOT NULL DEFAULT '',
    "fuenteContacto" TEXT NOT NULL DEFAULT '',
    "estatus" TEXT NOT NULL DEFAULT '',
    "notas" TEXT NOT NULL DEFAULT '',
    "esEmpresa" BOOLEAN NOT NULL DEFAULT false,
    "rfc" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT NOT NULL DEFAULT '',
    "razonSocial" TEXT NOT NULL DEFAULT '',
    "actividadComercial" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Proyecto" (
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
    "estatus" TEXT NOT NULL DEFAULT 'borrador',
    "pasoActual" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Proyecto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsumoPeriodo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "inicioStr" TEXT NOT NULL DEFAULT '',
    "terminoStr" TEXT NOT NULL DEFAULT '',
    "kwh" REAL NOT NULL DEFAULT 0,
    "pago" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsumoPeriodo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "panelId" TEXT,
    "panelClave" TEXT NOT NULL DEFAULT '',
    "panelNombre" TEXT NOT NULL DEFAULT '',
    "panelWatts" REAL NOT NULL DEFAULT 0,
    "cantPaneles" INTEGER NOT NULL DEFAULT 0,
    "inversorId" TEXT,
    "inversorClave" TEXT NOT NULL DEFAULT '',
    "inversorNombre" TEXT NOT NULL DEFAULT '',
    "inversorWattsMax" REAL NOT NULL DEFAULT 0,
    "cantInversores" INTEGER NOT NULL DEFAULT 0,
    "estructuraId" TEXT,
    "estructuraNombre" TEXT NOT NULL DEFAULT '',
    "estructuraPrecio" REAL NOT NULL DEFAULT 0,
    "tamanoSistemaW" REAL NOT NULL DEFAULT 0,
    "produccionPeriodo" REAL NOT NULL DEFAULT 0,
    "autoconsumoPct" REAL NOT NULL DEFAULT 0,
    "nuevoPago" REAL NOT NULL DEFAULT 0,
    "ahorroPeriodo" REAL NOT NULL DEFAULT 0,
    "ahorroAnual" REAL NOT NULL DEFAULT 0,
    "subtotalGeneral" REAL NOT NULL DEFAULT 0,
    "montoDescuento" REAL NOT NULL DEFAULT 0,
    "subtotalConDescuento" REAL NOT NULL DEFAULT 0,
    "montoIva" REAL NOT NULL DEFAULT 0,
    "granTotal" REAL NOT NULL DEFAULT 0,
    "roiTexto" TEXT NOT NULL DEFAULT '',
    "tirPorcentaje" REAL NOT NULL DEFAULT 0,
    "kgCo2" REAL NOT NULL DEFAULT 0,
    "arboles" INTEGER NOT NULL DEFAULT 0,
    "kmAuto" REAL NOT NULL DEFAULT 0,
    "metodoPrecio" TEXT NOT NULL DEFAULT 'unitario',
    "tipoMoneda" TEXT NOT NULL DEFAULT 'MXN',
    "valorDolar" REAL NOT NULL DEFAULT 16.9,
    "incluirIva" BOOLEAN NOT NULL DEFAULT false,
    "ocultarDesglose" BOOLEAN NOT NULL DEFAULT false,
    "descuento5" BOOLEAN NOT NULL DEFAULT false,
    "descuento10" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cotizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cotizacion_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cotizacion_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "Inversor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cotizacion_estructuraId_fkey" FOREIGN KEY ("estructuraId") REFERENCES "Estructura" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionConcepto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "costoBase" REAL NOT NULL,
    "margenPorcentaje" REAL NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CotizacionConcepto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionCargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CotizacionCargo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT,
    "contactoId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "fechaVencimiento" DATETIME,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarea_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarea_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "generadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Documento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Panel_clave_key" ON "Panel"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Inversor_clave_key" ON "Inversor"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Tarifa_codigo_key" ON "Tarifa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_estado_nombre_key" ON "Localidad"("estado", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Contacto_codigo_key" ON "Contacto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Proyecto_codigo_key" ON "Proyecto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumoPeriodo_proyectoId_orden_key" ON "ConsumoPeriodo"("proyectoId", "orden");
