'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Icono } from '../../../components/Icono';
import { ConsumoPeriodo, PanelData, InversorData } from '../types';
import { panelesData, inversoresData } from '../constants';
import GraficaProyeccion from './charts/GraficaProyeccion';
import {
  formatearMoneda,
  type CodigoAdvertencia,
  type PaqueteRecomendado,
  type PerfilPaquete,
  type ResultadoRecomendacion,
} from '@cotizador/shared';

interface Paso3EquipoProps {
  panelKey: string;
  setPanelKey: (val: string) => void;
  cantPaneles: number | '';
  setCantPaneles: (val: number | '') => void;
  inversorKey: string;
  setInversorKey: (val: string) => void;
  cantInversores: number | '';
  setCantInversores: (val: number | '') => void;

  tamanoSistema: number;
  produccion: number;
  autoconsumo: number;
  nuevoPago: number;
  ahorro: number;
  pagoPromedioCFE: number;
  consumos: ConsumoPeriodo[];
  paneles?: Record<string, PanelData>;
  inversores?: Record<string, InversorData>;
  limiteDacKwh?: number | null;
  costoPromedioKwh?: number;
  recomendacionEquipo?: ResultadoRecomendacion;

  onAnterior: () => void;
  onSiguiente: () => void;
}

const ETIQUETAS_PERFIL: Record<PerfilPaquete, string> = {
  economico: 'Económico',
  equilibrado: 'Equilibrado',
  maximoAhorro: 'Máximo ahorro',
};

/** Mensajes en español para las advertencias globales que pueden dejar sin tarjetas al Paso 3. */
const MENSAJES_SIN_PAQUETES: Partial<Record<CodigoAdvertencia, string>> = {
  SIN_CONSUMO: 'Captura los consumos del Paso 2 para poder calcular una recomendación de equipo.',
  CONSUMO_MENOR_QUE_UN_PANEL:
    'El panel más pequeño del catálogo ya produce más energía de la que consume el cliente. Ajusta la cantidad manualmente abajo.',
  SIN_INVERSOR_VIABLE:
    'Ningún inversor del catálogo da la capacidad necesaria para el arreglo de paneles requerido.',
  FACTORES_INVALIDOS: 'El factor de producción configurado no es válido. Revísalo en Configuración → Utilidad.',
};

function mensajeSinPaquetes(advertencias: CodigoAdvertencia[]): ReactNode {
  if (advertencias.includes('SIN_PANELES') || advertencias.includes('SIN_INVERSORES')) {
    const faltante = advertencias.includes('SIN_PANELES') && advertencias.includes('SIN_INVERSORES')
      ? 'paneles e inversores'
      : advertencias.includes('SIN_PANELES')
        ? 'paneles'
        : 'inversores';
    return (
      <>
        No hay {faltante} en el catálogo. Agrega al menos uno en{' '}
        <Link href="/config/catalogo" className="font-semibold underline hover:text-[#00388d]">
          Configuración → Catálogo
        </Link>
        .
      </>
    );
  }

  for (const codigo of advertencias) {
    const mensaje = MENSAJES_SIN_PAQUETES[codigo];
    if (mensaje) return mensaje;
  }

  return 'No fue posible calcular una recomendación de equipo con los datos disponibles.';
}

interface TarjetaPaqueteProps {
  paquete: PaqueteRecomendado;
  seleccionado: boolean;
  onElegir: () => void;
}

function TarjetaPaquete({ paquete, seleccionado, onElegir }: TarjetaPaqueteProps) {
  const sobredimensionado = paquete.advertencias.includes('INVERSOR_SOBREDIMENSIONADO');

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-colors min-w-0 ${
        seleccionado ? 'border-[#2dd4bf] bg-teal-50/40 ring-1 ring-[#2dd4bf]' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold uppercase text-[#00388d] break-words">
          {paquete.perfiles.map((perfil) => ETIQUETAS_PERFIL[perfil]).join(' · ')}
        </h4>
        {seleccionado && (
          <span className="flex items-center gap-1 text-[#2dd4bf] text-xs font-semibold shrink-0">
            <Icono icon={CheckCircle2} size={16} />
            Elegido
          </span>
        )}
      </div>

      <div className="space-y-1 mb-4 text-sm text-gray-700">
        <p>
          <span className="font-semibold">{paquete.cantPaneles}</span> × {paquete.panel.nombre}
        </p>
        <p>
          <span className="font-semibold">{paquete.cantInversores}</span> × {paquete.inversor.nombre}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Cobertura</p>
          <p className="font-bold text-gray-700">{paquete.coberturaPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Inversión est.</p>
          <p className="font-bold text-gray-700 break-words">{formatearMoneda(paquete.inversionEstimada)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Ahorro / periodo</p>
          <p className="font-bold text-[#2dd4bf]">{formatearMoneda(paquete.ahorroPorPeriodo)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Retorno</p>
          <p className="font-bold text-gray-700">
            {paquete.retornoAnios !== null ? `${paquete.retornoAnios.toFixed(1)} años` : '—'}
          </p>
        </div>
      </div>

      {sobredimensionado && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 mb-3">
          <Icono icon={AlertTriangle} size={14} className="mt-0.5" />
          El inversor queda sobredimensionado: no hay otro en el catálogo con mejor relación de carga para este arreglo.
        </p>
      )}

      <button
        type="button"
        onClick={onElegir}
        className={`mt-auto w-full rounded-full py-2 text-sm font-bold transition-colors cursor-pointer ${
          seleccionado
            ? 'bg-[#2dd4bf] text-white'
            : 'bg-[#00388d] text-white hover:bg-[#002a6b]'
        }`}
      >
        {seleccionado ? 'Usar este paquete' : 'Elegir'}
      </button>
    </div>
  );
}

interface RecomendacionEquipoProps {
  recomendacion: ResultadoRecomendacion;
  panelKey: string;
  cantPaneles: number | '';
  inversorKey: string;
  cantInversores: number | '';
  onElegirPaquete: (paquete: PaqueteRecomendado) => void;
}

function RecomendacionEquipo({
  recomendacion,
  panelKey,
  cantPaneles,
  inversorKey,
  cantInversores,
  onElegirPaquete,
}: RecomendacionEquipoProps) {
  const { paquetes, advertencias } = recomendacion;

  if (paquetes.length === 0) {
    return (
      <div className="mb-10 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <Icono icon={AlertTriangle} size={18} className="mt-0.5 shrink-0" />
        <p>{mensajeSinPaquetes(advertencias)}</p>
      </div>
    );
  }

  const esElegido = (paquete: PaqueteRecomendado) =>
    panelKey === paquete.panel.clave &&
    Number(cantPaneles) === paquete.cantPaneles &&
    inversorKey === paquete.inversor.clave &&
    Number(cantInversores) === paquete.cantInversores;

  const perfilesColapsados = advertencias.includes('PERFILES_COLAPSADOS');
  const coberturaMaximaNoAlcanzable = advertencias.includes('COBERTURA_MAXIMA_NO_ALCANZABLE');

  return (
    <div className="mb-10">
      <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Recomendación de equipo</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        {paquetes.map((paquete) => (
          <TarjetaPaquete
            key={`${paquete.panel.clave}|${paquete.cantPaneles}|${paquete.inversor.clave}|${paquete.cantInversores}`}
            paquete={paquete}
            seleccionado={esElegido(paquete)}
            onElegir={() => onElegirPaquete(paquete)}
          />
        ))}
      </div>

      {(perfilesColapsados || coberturaMaximaNoAlcanzable) && (
        <div className="flex flex-col gap-2 mt-2">
          {perfilesColapsados && (
            <p className="flex items-start gap-1.5 text-xs text-gray-500">
              <Icono icon={Info} size={14} className="mt-0.5 shrink-0" />
              Con este consumo y el catálogo actual solo hay una configuración recomendable; por eso ves menos de
              tres tarjetas.
            </p>
          )}
          {coberturaMaximaNoAlcanzable && (
            <p className="flex items-start gap-1.5 text-xs text-gray-500">
              <Icono icon={Info} size={14} className="mt-0.5 shrink-0" />
              Ni el arreglo más grande del catálogo alcanza a cubrir el 100% del consumo del cliente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Paso3Equipo({
  panelKey,
  setPanelKey,
  cantPaneles,
  setCantPaneles,
  inversorKey,
  setInversorKey,
  cantInversores,
  setCantInversores,
  tamanoSistema,
  produccion,
  autoconsumo,
  nuevoPago,
  ahorro,
  pagoPromedioCFE,
  consumos,
  paneles = panelesData,
  inversores = inversoresData,
  limiteDacKwh = null,
  costoPromedioKwh = 0,
  recomendacionEquipo,
  onAnterior,
  onSiguiente,
}: Paso3EquipoProps) {
  const handleElegirPaquete = (paquete: PaqueteRecomendado) => {
    setPanelKey(paquete.panel.clave);
    setCantPaneles(paquete.cantPaneles);
    setInversorKey(paquete.inversor.clave);
    setCantInversores(paquete.cantInversores);
  };

  return (
    <form className="space-y-10 animate-fade-in pt-4" onSubmit={(e) => e.preventDefault()}>
      {/* Recomendación automática de paquetes */}
      {recomendacionEquipo && (
        <RecomendacionEquipo
          recomendacion={recomendacionEquipo}
          panelKey={panelKey}
          cantPaneles={cantPaneles}
          inversorKey={inversorKey}
          cantInversores={cantInversores}
          onElegirPaquete={handleElegirPaquete}
        />
      )}

      {/* Barra de progreso de Autoconsumo */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <span className="text-sm font-bold text-gray-400">Porcentaje de autoconsumo</span>
          <div className="text-[#2dd4bf] font-bold text-xl w-24 text-right">
            {autoconsumo.toFixed(2)}%
          </div>
        </div>

        <div className="relative w-full h-3 bg-gray-200 rounded-full">
          <div
            className="bg-[#2dd4bf] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(autoconsumo, 100)}%` }}
          />
          <div
            className="absolute -top-8 bg-[#2dd4bf] text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center justify-center transition-all duration-500 ease-out z-10"
            style={{
              left: `${Math.min(autoconsumo, 100)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.min(autoconsumo, 100).toFixed(0)}%
            <div className="absolute -bottom-1 w-2 h-2 bg-[#2dd4bf] rotate-45" />
          </div>
        </div>
      </div>

      <hr className="border-gray-100 mb-8" />

      {/* Configuración de Paneles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 mb-1">Modelo del panel</label>
          <select
            value={panelKey}
            onChange={(e) => setPanelKey(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="" disabled hidden>
              Selecciona un panel...
            </option>
            {Object.entries(paneles).map(([key, data]) => (
              <option key={key} value={key}>
                {data.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={cantPaneles}
            onChange={(e) => setCantPaneles(e.target.value !== '' ? Number(e.target.value) : '')}
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Tamaño del sistema</label>
          <div className="w-full border-b border-gray-300 py-2 text-sm text-gray-800 h-9 flex items-center">
            {tamanoSistema > 0 ? `${tamanoSistema.toLocaleString('en-US')} watt` : ''}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">
            Producción del sistema
          </label>
          <div className="w-full border-b border-gray-300 py-2 text-sm text-gray-800 h-9 flex items-center">
            {produccion > 0 ? `${produccion.toFixed(2)} kWh/periodo` : ''}
          </div>
        </div>
      </div>

      {/* Configuración de Inversores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 mb-1">Tipo de inversor</label>
          <select
            value={inversorKey}
            onChange={(e) => setInversorKey(e.target.value)}
            className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
          >
            <option value="" disabled hidden>
              Selecciona un inversor...
            </option>
            {Object.entries(inversores).map(([key, data]) => (
              <option key={key} value={key}>
                {data.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={cantInversores}
            onChange={(e) =>
              setCantInversores(e.target.value !== '' ? Number(e.target.value) : '')
            }
            className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
          />
        </div>

      </div>

      {/* Resumen Comparativo de Costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs text-gray-400 mb-4 font-semibold uppercase">Sin paneles</h4>
          <p className="text-xs text-gray-400 mb-1">Pago promedio por periodo a CFE</p>
          <p className="text-2xl font-bold text-gray-600">${pagoPromedioCFE.toFixed(2)}</p>
        </div>

        <div className="md:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs text-gray-400 mb-4 font-semibold uppercase">Con paneles</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Pago promedio con paneles</p>
              <p className="text-2xl font-bold text-gray-600">${nuevoPago.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Ahorro por periodo</p>
              <p className="text-2xl font-bold text-[#2dd4bf]">${ahorro.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Autoconsumo</p>
              <p className="text-2xl font-bold text-[#2dd4bf]">{autoconsumo.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100 my-8" />

      {/* Gráfica de Proyección de Pagos */}
      <div className="w-full">
        <h3 className="text-center font-bold text-gray-600 mb-1">Proyección de pagos</h3>
        <p className="text-center text-xs text-gray-400 mb-8 capitalize">
          {consumos[5]?.inicioStr
            ? `${consumos[5].inicioStr} - ${consumos[0]?.terminoStr}`
            : 'Periodo de pagos'}
        </p>

        <GraficaProyeccion
          consumos={consumos}
          autoconsumo={autoconsumo}
          ahorro={ahorro}
          limiteDacKwh={limiteDacKwh}
          costoPromedioKwh={costoPromedioKwh}
        />
      </div>

      <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          Regresar a Consumo
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Guardar y continuar a Otros cargos
        </button>
      </div>
    </form>
  );
}
