'use client';

import React, { useMemo } from 'react';
import {
  Card,
  ResumenEmpresa,
  ResumenContactoConsumo,
  ResumenEquipo,
  ResumenAhorro,
  TablaConsumoHistorico,
  BeneficioAmbiental,
  MetricasFinancieras,
  TablaRetornoInversion,
  ResumenCotizacion,
  AccionesProyecto,
  calcularProduccionEstacional,
  calcularProyeccion5Anos,
} from './confirmacion';
import GraficaConsumoAnual from './charts/GraficaConsumoAnual';
import GraficaProyeccion from './charts/GraficaProyeccion';
import GraficaGastoAcumulado from './charts/GraficaGastoAcumulado';
import {
  ConsumoPeriodo,
  DatosContacto,
  DatosEmpresa,
  ConceptoCotizacion,
  EstructuraInstalacion,
  CargoEditable,
  TipoMoneda,
} from '../types';

export interface Paso5ConfirmacionProps {
  // Datos Paso 1: Contacto
  datosContacto?: DatosContacto;

  // Datos Paso 2: Consumo
  nombreProyecto?: string;
  nombreRecibo?: string;
  tarifaSeleccionada?: string;
  numeroServicio?: string;
  periodo?: string;
  consumos?: ConsumoPeriodo[];
  consumoPromedioKwh?: number;
  pagoPromedioCFE?: number;

  // Datos Paso 3: Equipo
  panelKey?: string;
  cantPaneles?: number | '';
  inversorKey?: string;
  cantInversores?: number | '';
  tamanoSistema?: number;
  produccion?: number;
  autoconsumo?: number;
  nuevoPago?: number;
  ahorro?: number;

  // Datos Paso 4: Cotización / Otros Cargos
  conceptos?: ConceptoCotizacion[];
  estructuraActual?: EstructuraInstalacion;
  cargosEditables?: CargoEditable[];
  subtotalConDescuento?: number;
  granTotal?: number;
  incluirIva?: boolean;
  tipoMoneda?: TipoMoneda;

  // Datos Empresa
  empresa?: DatosEmpresa;

  // Acciones / Navegación
  onAnterior?: () => void;
  onFinalizar?: () => void;
  onDescargarCotizacion?: () => void;
}

export default function Paso5Confirmacion({
  datosContacto,
  nombreProyecto = '',
  nombreRecibo = '',
  tarifaSeleccionada = '1A',
  numeroServicio = '',
  periodo = 'Bimestral',
  consumos = [],
  consumoPromedioKwh = 0,
  pagoPromedioCFE = 0,
  panelKey = '',
  cantPaneles = 0,
  inversorKey = '',
  cantInversores = 0,
  tamanoSistema = 0,
  produccion = 0,
  autoconsumo = 0,
  nuevoPago = 0,
  ahorro = 0,
  conceptos = [],
  estructuraActual,
  cargosEditables = [],
  subtotalConDescuento = 0,
  granTotal = 0,
  incluirIva = false,
  tipoMoneda = 'MXN',
  empresa,
  onAnterior,
  onFinalizar,
  onDescargarCotizacion,
}: Paso5ConfirmacionProps) {
  // Ahorro anual estimado (ahorro por periodo * 6 bimestres o 12 meses)
  const ahorroAnual = useMemo(() => {
    const multiplicador = periodo === 'Bimestral' ? 6 : 12;
    return ahorro * multiplicador;
  }, [ahorro, periodo]);

  // Datos para Gráfica de Consumo Anual (orden cronológico)
  const labelsGraficaConsumo = useMemo(() => {
    return consumos.slice().reverse().map((c, i) => c.inicioStr || `P${i + 1}`);
  }, [consumos]);

  const consumoHistoricoGrafica = useMemo(() => {
    return consumos.slice().reverse().map((c) => Number(c.kwh) || 0);
  }, [consumos]);

  const produccionSolarGrafica = useMemo(() => {
    return calcularProduccionEstacional(produccion, consumos.length).reverse();
  }, [produccion, consumos.length]);

  // Datos para Gráfica de Gasto Acumulado a 5 años
  const proyeccion5Anos = useMemo(() => {
    return calcularProyeccion5Anos(pagoPromedioCFE, nuevoPago, granTotal, periodo);
  }, [pagoPromedioCFE, nuevoPago, granTotal, periodo]);

  return (
    <div className="space-y-6 animate-fade-in text-gray-700">
      {/* 1. INFORMACIÓN DE EMPRESA */}
      <ResumenEmpresa empresa={empresa} />

      {/* 2. CONTACTO Y CONSUMO */}
      <ResumenContactoConsumo
        datosContacto={datosContacto}
        nombreProyecto={nombreProyecto}
        nombreRecibo={nombreRecibo}
        tarifaSeleccionada={tarifaSeleccionada}
        numeroServicio={numeroServicio}
        consumoPromedioKwh={consumoPromedioKwh}
        pagoPromedioCFE={pagoPromedioCFE}
        periodo={periodo}
      />

      {/* 3. INFORMACIÓN DE EQUIPO */}
      <ResumenEquipo
        panelKey={panelKey}
        cantPaneles={cantPaneles}
        inversorKey={inversorKey}
        cantInversores={cantInversores}
        tamanoSistema={tamanoSistema}
        produccion={produccion}
        autoconsumo={autoconsumo}
        periodo={periodo}
      />

      {/* 4. PAGOS Y AHORROS */}
      <ResumenAhorro
        pagoPromedioCFE={pagoPromedioCFE}
        nuevoPago={nuevoPago}
        ahorro={ahorro}
        periodo={periodo}
      />

      {/* 5. TABLA CONSUMO HISTÓRICO */}
      <TablaConsumoHistorico consumos={consumos} />

      {/* 6. GRÁFICAS DE CONSUMO Y PROYECCIÓN */}
      <Card>
        <h3 className="text-center font-bold text-gray-700 mb-2">
          Comparativo de consumo anual
        </h3>
        <GraficaConsumoAnual
          labels={labelsGraficaConsumo.length > 0 ? labelsGraficaConsumo : undefined}
          consumoHistorico={consumoHistoricoGrafica.length > 0 ? consumoHistoricoGrafica : undefined}
          produccionSolar={produccionSolarGrafica.length > 0 ? produccionSolarGrafica : undefined}
        />
      </Card>

      <Card>
        <h3 className="text-center font-bold text-gray-700 mb-2">Proyección de pagos</h3>
        <GraficaProyeccion
          consumos={consumos}
          autoconsumo={autoconsumo}
          ahorro={ahorro}
        />
      </Card>

      {/* 7. BENEFICIO AMBIENTAL */}
      <BeneficioAmbiental produccion={produccion} periodo={periodo} />

      {/* 8. MÉTRICAS FINANCIERAS (Gasto 5 años, TIR, ROI) */}
      <MetricasFinancieras
        pagoPromedioCFE={pagoPromedioCFE}
        nuevoPago={nuevoPago}
        granTotalInversion={granTotal}
        ahorroAnual={ahorroAnual}
        periodo={periodo}
      />

      {/* 9. DETALLE DEL RETORNO DE INVERSIÓN (TABLA PERIODOS Y BANCO SOLAR) */}
      <TablaRetornoInversion
        consumos={consumos}
        produccion={produccion}
        nuevoPago={nuevoPago}
      />

      {/* 10. GRÁFICA DE GASTO ACUMULADO */}
      <Card>
        <h3 className="text-center font-bold text-gray-700 mb-2">Gasto Acumulado</h3>
        <GraficaGastoAcumulado
          conPaneles={proyeccion5Anos.arrayConPaneles}
          sinPaneles={proyeccion5Anos.arraySinPaneles}
        />
      </Card>

      {/* 11. REVISA TU COTIZACIÓN */}
      <ResumenCotizacion
        conceptos={conceptos}
        estructuraActual={estructuraActual}
        cargosEditables={cargosEditables}
        subtotalConDescuento={subtotalConDescuento}
        granTotal={granTotal}
        incluirIva={incluirIva}
        tipoMoneda={tipoMoneda}
      />

      {/* 12. PROYECTO, DOCUMENTOS Y BOTONES DE FINALIZACIÓN */}
      <AccionesProyecto
        onAnterior={onAnterior}
        onFinalizar={onFinalizar}
        onDescargarCotizacion={onDescargarCotizacion}
      />
    </div>
  );
}
