-- CreateTable
CREATE TABLE "CfeTariffRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tariffCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "tierIndex" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "limitKwh" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CfeTariffRate_tariffCode_year_month_idx" ON "CfeTariffRate"("tariffCode", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CfeTariffRate_tariffCode_year_month_season_tierIndex_key" ON "CfeTariffRate"("tariffCode", "year", "month", "season", "tierIndex");

