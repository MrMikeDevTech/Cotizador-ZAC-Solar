'use client';

import React from 'react';
import Paso5Confirmacion from '../components/Paso5Confirmacion';
import { ConsumoPeriodo, DatosContacto, ConceptoCotizacion } from '../types';
import { LISTA_ESTRUCTURAS } from '../constants';

export default function PruebasPaso5() {
  // ==========================================
  // DATOS DE PRUEBA (MOCK DATA)
  // ==========================================
  const mockContacto: DatosContacto = {
    nombre: 'YARELI',
    apellidoPaterno: 'RAMIREZ',
    apellidoMaterno: 'SANTIAGO',
    telefono: '3271128421',
    celular: '3271128421',
    email: 'correo@ejemplo.com',
    estado: 'Nayarit',
    localidad: 'Compostela',
    fuenteContacto: 'Conocido',
    estatus: 'Cotización entregada',
    notas: 'Cliente interesado en financiamiento',
    mostrarEmpresariales: false,
    empresariales: {
      rfc: '',
      cargo: '',
      razonSocial: '',
      actividadComercial: '',
    },
  };

  const mockConsumos: ConsumoPeriodo[] = [
    { inicioStr: 'marzo 2026', terminoStr: 'mayo 2026', kwh: '786', pago: '2110.43' },
    { inicioStr: 'enero 2026', terminoStr: 'marzo 2026', kwh: '582', pago: '1572.20' },
    { inicioStr: 'noviembre 2025', terminoStr: 'enero 2026', kwh: '668', pago: '1955.10' },
    { inicioStr: 'septiembre 2025', terminoStr: 'noviembre 2025', kwh: '896', pago: '2972.96' },
    { inicioStr: 'julio 2025', terminoStr: 'septiembre 2025', kwh: '975', pago: '2903.51' },
    { inicioStr: 'mayo 2025', terminoStr: 'julio 2025', kwh: '861', pago: '2373.56' },
  ];

  const mockConceptos: ConceptoCotizacion[] = [
    { id: '1', concepto: 'Precio de paneles', costoBase: 30800, margenPorcentaje: 0 },
    { id: '2', concepto: 'Precio de inversores', costoBase: 13500, margenPorcentaje: 0 },
    { id: '3', concepto: 'Precio material eléctrico', costoBase: 8120, margenPorcentaje: 0 },
    { id: '4', concepto: 'Mano de obra', costoBase: 8400, margenPorcentaje: 0 },
  ];

  const estructuraActual = LISTA_ESTRUCTURAS.find((e) => e.id === 'angulo') || {
    id: 'angulo',
    nombre: 'Estructura Angulo aluminio',
    precio: 8400,
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        {/* ENCABEZADO DE PASOS (Simulado para pruebas) */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 overflow-x-auto gap-4 text-xs font-semibold">
          <div className="text-gray-400 whitespace-nowrap">1. Contacto</div>
          <div className="text-gray-400 whitespace-nowrap">2. Consumo</div>
          <div className="text-gray-400 whitespace-nowrap">3. Equipo</div>
          <div className="text-gray-400 whitespace-nowrap">4. Otros cargos</div>
          <div className="text-[#00388d] font-bold border-b-2 border-[#2dd4bf] pb-1 whitespace-nowrap">
            5. Confirmación
          </div>
        </div>

        {/* COMPONENTE COMPONETIZADO Y CONECTADO DE PASO 5 */}
        <Paso5Confirmacion
          datosContacto={mockContacto}
          nombreProyecto="YARELI RAMIREZ SANTIAGO"
          nombreRecibo="RAMIREZ SANTIAGO YARELI"
          tarifaSeleccionada="1B"
          numeroServicio="495150300176"
          periodo="Bimestral"
          consumos={mockConsumos}
          consumoPromedioKwh={794.67}
          pagoPromedioCFE={2314.63}
          panelKey="jinko_615"
          cantPaneles={7}
          inversorKey="growatt_mic_3300"
          cantInversores={1}
          tamanoSistema={4305}
          produccion={998.72}
          autoconsumo={125.66}
          nuevoPago={80.50}
          ahorro={2254.13}
          conceptos={mockConceptos}
          estructuraActual={estructuraActual}
          cargosEditables={[]}
          subtotalConDescuento={69220}
          granTotal={69220}
          incluirIva={false}
          tipoMoneda="MXN"
          onAnterior={() => alert('Regresar a paso 4')}
          onFinalizar={() => alert('Proyecto creado con éxito desde pruebas')}
          onDescargarCotizacion={() => alert('Descargando cotización...')}
        />
      </div>
    </div>
  );
}