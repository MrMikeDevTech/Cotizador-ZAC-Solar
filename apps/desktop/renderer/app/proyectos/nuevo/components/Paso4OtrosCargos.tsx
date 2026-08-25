'use client';

import { useState, useMemo } from 'react';
import {
  MetodoPrecio,
  TipoMoneda,
  CargoEditable,
  ConceptoCotizacion,
} from '../types';
import { LISTA_ESTRUCTURAS, CONCEPTOS_COTIZACION_DEFECTO } from '../constants';
import {
  ModalMetodoPrecio,
  ModalAjustesExtras,
  ModalCargosEditables,
  SelectorEstructura,
  TablaCotizacion,
  Financiamiento,
} from './otros-cargos';

interface Paso4OtrosCargosProps {
  conceptosIniciales?: ConceptoCotizacion[];
  onSiguiente?: () => void;
  onAnterior?: () => void;
}

export default function Paso4OtrosCargos({
  conceptosIniciales,
  onSiguiente,
  onAnterior,
}: Paso4OtrosCargosProps) {
  // --- SELECCIÓN DE ESTRUCTURA ---
  const [estructuraSeleccionadaId, setEstructuraSeleccionadaId] = useState<string | null>('perforacion');

  // --- ESTADOS DE MODALES ---
  const [modalPrecioOpen, setModalPrecioOpen] = useState<boolean>(false);
  const [modalAjustesOpen, setModalAjustesOpen] = useState<boolean>(false);
  const [modalCargosOpen, setModalCargosOpen] = useState<boolean>(false);

  // --- CONFIGURACIÓN DE COTIZACIÓN ---
  const [metodoPrecio, setMetodoPrecio] = useState<MetodoPrecio>('unitario');
  const [opcionesAvanzadas, setOpcionesAvanzadas] = useState<boolean>(false);
  const [incluirIva, setIncluirIva] = useState<boolean>(false);
  const [tipoMoneda, setTipoMoneda] = useState<TipoMoneda>('MXN');
  const [valorDolar, setValorDolar] = useState<number>(16.90);
  const [ocultarDesglose, setOcultarDesglose] = useState<boolean>(false);

  // --- DESCUENTOS Y CARGOS ---
  const [descuento5, setDescuento5] = useState<boolean>(false);
  const [descuento10, setDescuento10] = useState<boolean>(false);
  const [cargosEditables, setCargosEditables] = useState<CargoEditable[]>([]);

  // --- CONCEPTOS DINÁMICOS DEL PROYECTO ---
  const [conceptos, setConceptos] = useState<ConceptoCotizacion[]>(
    conceptosIniciales || CONCEPTOS_COTIZACION_DEFECTO
  );

  // --- CÁLCULOS DINÁMICOS ---
  const estructuraActual = useMemo(
    () => LISTA_ESTRUCTURAS.find((e) => e.id === estructuraSeleccionadaId),
    [estructuraSeleccionadaId]
  );
  const precioEstructura = estructuraActual ? estructuraActual.precio : 0;

  const subtotalConceptos = useMemo(
    () =>
      conceptos.reduce(
        (acc, curr) => acc + curr.costoBase * (1 + curr.margenPorcentaje / 100),
        0
      ),
    [conceptos]
  );

  const subtotalCargosEditables = useMemo(
    () => cargosEditables.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0),
    [cargosEditables]
  );

  const subtotalGeneral = subtotalConceptos + subtotalCargosEditables + precioEstructura;

  let porcentajeDescuento = 0;
  if (descuento5) porcentajeDescuento += 5;
  if (descuento10) porcentajeDescuento += 10;

  const montoDescuento = subtotalGeneral * (porcentajeDescuento / 100);
  const subtotalConDescuento = subtotalGeneral - montoDescuento;

  const montoIVA = incluirIva ? subtotalConDescuento * 0.16 : 0;
  const granTotal = subtotalConDescuento + montoIVA;

  const utilidadTotalMXN = useMemo(
    () =>
      conceptos.reduce(
        (acc, item) => acc + item.costoBase * (item.margenPorcentaje / 100),
        0
      ),
    [conceptos]
  );

  const porcentajeUtilidadTotal =
    subtotalConceptos > 0 ? (utilidadTotalMXN / subtotalConceptos) * 100 : 0;

  // --- HANDLERS ---
  const handleToggleEstructura = (id: string) => {
    setEstructuraSeleccionadaId((prev) => (prev === id ? null : id));
  };

  const handleMargenPorcentajeChange = (id: string, nuevoMargen: number): void => {
    setConceptos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, margenPorcentaje: nuevoMargen } : item
      )
    );
  };

  const handleMargenMXNChange = (id: string, nuevoMargenMXN: number): void => {
    setConceptos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nuevoPorcentaje =
            item.costoBase > 0 ? (nuevoMargenMXN / item.costoBase) * 100 : 0;
          return { ...item, margenPorcentaje: nuevoPorcentaje };
        }
        return item;
      })
    );
  };

  const handleAgregarCargo = (): void => {
    setCargosEditables((prev) => [
      ...prev,
      { id: Date.now().toString(), nombre: '', monto: 0 },
    ]);
  };

  const handleEliminarCargo = (id: string): void => {
    setCargosEditables((prev) => prev.filter((cargo) => cargo.id !== id));
  };

  const handleUpdateCargo = (
    id: string,
    field: 'nombre' | 'monto',
    value: string | number
  ): void => {
    setCargosEditables((prev) =>
      prev.map((cargo) => (cargo.id === id ? { ...cargo, [field]: value } : cargo))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pt-2">
      {/* --- BOTONES ACCIONES SUPERIORES --- */}
      <div className="flex flex-wrap justify-end gap-3 mb-6">
        <button
          type="button"
          onClick={() => setModalPrecioOpen(true)}
          className="flex items-center gap-2 border border-[#2dd4bf] text-[#2dd4bf] hover:bg-teal-50 px-4 py-2 rounded-full font-semibold text-xs transition cursor-pointer"
        >
          <span className="capitalize">
            {metodoPrecio === 'unitario'
              ? 'Precio unitario'
              : metodoPrecio === 'watt'
              ? 'Dólar por watt'
              : 'Dólar por panel'}
          </span>
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setModalAjustesOpen(true)}
          className="border border-[#2dd4bf] text-[#2dd4bf] hover:bg-teal-50 px-5 py-2 rounded-full font-semibold text-xs transition cursor-pointer"
        >
          Ajustes extras
        </button>

        <button
          type="button"
          onClick={() => setOpcionesAvanzadas(!opcionesAvanzadas)}
          className={`px-5 py-2 rounded-full font-semibold text-xs transition shadow-sm cursor-pointer ${
            opcionesAvanzadas
              ? 'bg-[#00388d] text-white'
              : 'bg-[#2dd4bf] text-white hover:bg-teal-500'
          }`}
        >
          Opciones avanzadas
        </button>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: Estructuras y Cargos */}
        <div className="lg:col-span-4">
          <SelectorEstructura
            estructuras={LISTA_ESTRUCTURAS}
            estructuraSeleccionadaId={estructuraSeleccionadaId}
            onToggleEstructura={handleToggleEstructura}
            onAbrirModalCargos={() => setModalCargosOpen(true)}
          />
        </div>

        {/* COLUMNA DERECHA: Tabla de Cotización y Totales */}
        <div className="lg:col-span-8">
          <TablaCotizacion
            conceptos={conceptos}
            opcionesAvanzadas={opcionesAvanzadas}
            estructuraActual={estructuraActual}
            cargosEditables={cargosEditables}
            tipoMoneda={tipoMoneda}
            setTipoMoneda={setTipoMoneda}
            valorDolar={valorDolar}
            setValorDolar={setValorDolar}
            ocultarDesglose={ocultarDesglose}
            setOcultarDesglose={setOcultarDesglose}
            incluirIva={incluirIva}
            setIncluirIva={setIncluirIva}
            subtotalConDescuento={subtotalConDescuento}
            granTotal={granTotal}
            utilidadTotalMXN={utilidadTotalMXN}
            porcentajeUtilidadTotal={porcentajeUtilidadTotal}
            onMargenPorcentajeChange={handleMargenPorcentajeChange}
            onMargenMXNChange={handleMargenMXNChange}
          />
        </div>
      </div>

      {/* --- SIMULACIÓN DE FINANCIAMIENTO --- */}
      <Financiamiento />

      {/* --- NAVEGACIÓN INFERIOR --- */}
      <div className="flex justify-end items-center gap-6 pt-6 mt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          Regresar a Equipo
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"        >
          Guardar y continuar a Confirmación
        </button>
      </div>

      {/* --- MODALES --- */}
      <ModalMetodoPrecio
        isOpen={modalPrecioOpen}
        onClose={() => setModalPrecioOpen(false)}
        metodoPrecio={metodoPrecio}
        setMetodoPrecio={setMetodoPrecio}
      />

      <ModalAjustesExtras
        isOpen={modalAjustesOpen}
        onClose={() => setModalAjustesOpen(false)}
        descuento5={descuento5}
        setDescuento5={setDescuento5}
        descuento10={descuento10}
        setDescuento10={setDescuento10}
        subtotalConDescuento={subtotalConDescuento}
        tipoMoneda={tipoMoneda}
      />

      <ModalCargosEditables
        isOpen={modalCargosOpen}
        onClose={() => setModalCargosOpen(false)}
        cargosEditables={cargosEditables}
        onAgregarCargo={handleAgregarCargo}
        onEliminarCargo={handleEliminarCargo}
        onUpdateCargo={handleUpdateCargo}
      />
    </div>
  );
}
