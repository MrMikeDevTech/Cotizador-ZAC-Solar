'use client';

import { useState, useMemo } from 'react';
import {
  MetodoPrecio,
  TipoMoneda,
  CargoEditable,
  ConceptoCotizacion,
  EstructuraInstalacion,
} from '../types';
import { LISTA_ESTRUCTURAS, CONCEPTOS_COTIZACION_DEFECTO } from '../constants';
import { calcularTotalesCotizacion } from '@cotizador/shared';
import { useConfiguracion } from '../../../../lib/ConfiguracionContext';
import {
  ModalMetodoPrecio,
  ModalAjustesExtras,
  ModalCargosEditables,
  SelectorEstructura,
  TablaCotizacion,
} from './otros-cargos';

export interface Paso4OtrosCargosProps {
  // Estado controlado desde page.tsx
  estructuraSeleccionadaId?: string | null;
  setEstructuraSeleccionadaId?: (id: string | null) => void;
  metodoPrecio?: MetodoPrecio;
  setMetodoPrecio?: (metodo: MetodoPrecio) => void;
  metodoPago?: string;
  setMetodoPago?: (metodo: string) => void;
  observaciones?: string;
  setObservaciones?: (val: string) => void;
  opcionesAvanzadas?: boolean;
  setOpcionesAvanzadas?: (val: boolean) => void;
  incluirIva?: boolean;
  setIncluirIva?: (val: boolean) => void;
  tipoMoneda?: TipoMoneda;
  setTipoMoneda?: (val: TipoMoneda) => void;
  valorDolar?: number;
  setValorDolar?: (val: number) => void;
  ocultarDesglose?: boolean;
  setOcultarDesglose?: (val: boolean) => void;
  descuento5?: boolean;
  setDescuento5?: (val: boolean) => void;
  descuento10?: boolean;
  setDescuento10?: (val: boolean) => void;
  cargosEditables?: CargoEditable[];
  setCargosEditables?: React.Dispatch<React.SetStateAction<CargoEditable[]>>;
  conceptos?: ConceptoCotizacion[];
  setConceptos?: React.Dispatch<React.SetStateAction<ConceptoCotizacion[]>>;

  conceptosIniciales?: ConceptoCotizacion[];
  estructuras?: EstructuraInstalacion[];
  onSiguiente?: () => void;
  /** Guarda como borrador sin salir del paso. */
  onGuardar?: () => void;
  guardando?: boolean;
  onAnterior?: () => void;
}

export default function Paso4OtrosCargos({
  estructuraSeleccionadaId: controlledEstructuraId,
  setEstructuraSeleccionadaId: setControlledEstructuraId,
  metodoPrecio: controlledMetodoPrecio,
  setMetodoPrecio: setControlledMetodoPrecio,
  metodoPago: controlledMetodoPago,
  setMetodoPago: setControlledMetodoPago,
  observaciones: controlledObservaciones,
  setObservaciones: setControlledObservaciones,
  opcionesAvanzadas: controlledOpcionesAvanzadas,
  setOpcionesAvanzadas: setControlledOpcionesAvanzadas,
  incluirIva: controlledIncluirIva,
  setIncluirIva: setControlledIncluirIva,
  tipoMoneda: controlledTipoMoneda,
  setTipoMoneda: setControlledTipoMoneda,
  valorDolar: controlledValorDolar,
  setValorDolar: setControlledValorDolar,
  ocultarDesglose: controlledOcultarDesglose,
  setOcultarDesglose: setControlledOcultarDesglose,
  descuento5: controlledDescuento5,
  setDescuento5: setControlledDescuento5,
  descuento10: controlledDescuento10,
  setDescuento10: setControlledDescuento10,
  cargosEditables: controlledCargosEditables,
  setCargosEditables: setControlledCargosEditables,
  conceptos: controlledConceptos,
  setConceptos: setControlledConceptos,
  conceptosIniciales,
  estructuras = LISTA_ESTRUCTURAS,
  onSiguiente,
  onGuardar,
  guardando = false,
  onAnterior,
}: Paso4OtrosCargosProps) {
  // --- FALLBACKS LOCALES SI NO SE CONTROLAN DESDE EL PADRE ---
  const [localEstructuraId, setLocalEstructuraId] = useState<string | null>(null);
  const [localMetodoPrecio, setLocalMetodoPrecio] = useState<MetodoPrecio>('unitario');
  const [localMetodoPago, setLocalMetodoPago] = useState<string>('Contado');
  const [localObservaciones, setLocalObservaciones] = useState<string>('');
  const [localOpcionesAvanzadas, setLocalOpcionesAvanzadas] = useState<boolean>(false);
  const [localIncluirIva, setLocalIncluirIva] = useState<boolean>(false);
  const [localTipoMoneda, setLocalTipoMoneda] = useState<TipoMoneda>('MXN');
  const [localValorDolar, setLocalValorDolar] = useState<number>(16.90);
  const [localOcultarDesglose, setLocalOcultarDesglose] = useState<boolean>(false);
  const [localDescuento5, setLocalDescuento5] = useState<boolean>(false);
  const [localDescuento10, setLocalDescuento10] = useState<boolean>(false);
  const [localCargosEditables, setLocalCargosEditables] = useState<CargoEditable[]>([]);
  const [localConceptos, setLocalConceptos] = useState<ConceptoCotizacion[]>(
    conceptosIniciales || CONCEPTOS_COTIZACION_DEFECTO
  );

  // Estados efectivos (controlados o locales)
  const estructuraSeleccionadaId = controlledEstructuraId !== undefined ? controlledEstructuraId : localEstructuraId;
  const setEstructuraSeleccionadaId = setControlledEstructuraId || setLocalEstructuraId;

  const metodoPrecio = controlledMetodoPrecio !== undefined ? controlledMetodoPrecio : localMetodoPrecio;
  const setMetodoPrecio = setControlledMetodoPrecio || setLocalMetodoPrecio;

  const metodoPago = controlledMetodoPago !== undefined ? controlledMetodoPago : localMetodoPago;
  const setMetodoPago = setControlledMetodoPago || setLocalMetodoPago;

  const observaciones = controlledObservaciones !== undefined ? controlledObservaciones : localObservaciones;
  const setObservaciones = setControlledObservaciones || setLocalObservaciones;

  const opcionesAvanzadas = controlledOpcionesAvanzadas !== undefined ? controlledOpcionesAvanzadas : localOpcionesAvanzadas;
  const setOpcionesAvanzadas = setControlledOpcionesAvanzadas || setLocalOpcionesAvanzadas;

  const incluirIva = controlledIncluirIva !== undefined ? controlledIncluirIva : localIncluirIva;
  const setIncluirIva = setControlledIncluirIva || setLocalIncluirIva;

  const tipoMoneda = controlledTipoMoneda !== undefined ? controlledTipoMoneda : localTipoMoneda;
  const setTipoMoneda = setControlledTipoMoneda || setLocalTipoMoneda;

  const valorDolar = controlledValorDolar !== undefined ? controlledValorDolar : localValorDolar;
  const setValorDolar = setControlledValorDolar || setLocalValorDolar;

  const ocultarDesglose = controlledOcultarDesglose !== undefined ? controlledOcultarDesglose : localOcultarDesglose;
  const setOcultarDesglose = setControlledOcultarDesglose || setLocalOcultarDesglose;

  const descuento5 = controlledDescuento5 !== undefined ? controlledDescuento5 : localDescuento5;
  const setDescuento5 = setControlledDescuento5 || setLocalDescuento5;

  const descuento10 = controlledDescuento10 !== undefined ? controlledDescuento10 : localDescuento10;
  const setDescuento10 = setControlledDescuento10 || setLocalDescuento10;

  const cargosEditables = controlledCargosEditables !== undefined ? controlledCargosEditables : localCargosEditables;
  const setCargosEditables = setControlledCargosEditables || setLocalCargosEditables;

  const conceptos = controlledConceptos !== undefined ? controlledConceptos : localConceptos;
  const setConceptos = setControlledConceptos || setLocalConceptos;

  // --- ESTADOS DE MODALES ---
  const [modalPrecioOpen, setModalPrecioOpen] = useState<boolean>(false);
  const [modalAjustesOpen, setModalAjustesOpen] = useState<boolean>(false);
  const [modalCargosOpen, setModalCargosOpen] = useState<boolean>(false);

  // --- CÁLCULOS DINÁMICOS ---
  const estructuraActual = useMemo(
    () => estructuras.find((e) => e.id === estructuraSeleccionadaId),
    [estructuraSeleccionadaId, estructuras]
  );
  const precioEstructura = estructuraActual ? estructuraActual.precio : 0;

  const { factores } = useConfiguracion();

  const totales = useMemo(
    () =>
      calcularTotalesCotizacion({
        conceptos,
        cargosEditables,
        precioEstructura,
        descuento5,
        descuento10,
        incluirIva,
        ivaPorcentaje: factores.ivaPorcentaje,
      }),
    [conceptos, cargosEditables, precioEstructura, descuento5, descuento10, incluirIva, factores.ivaPorcentaje]
  );
  const { subtotalGeneral, subtotalConDescuento, granTotal, utilidadTotalMXN, porcentajeUtilidadTotal } = totales;

  // --- HANDLERS ---
  const handleToggleEstructura = (id: string) => {
    setEstructuraSeleccionadaId(estructuraSeleccionadaId === id ? null : id);
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

  return (
    <div className="space-y-6 animate-fade-in pt-2">
      {/* --- BOTONES ACCIONES SUPERIORES --- */}
      <div className="flex flex-wrap justify-end gap-3 mb-6 items-center">
        <input
          type="text"
          list="metodoPagoList"
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          placeholder="Método de pago"
          className="border border-[#2dd4bf] text-[#2dd4bf] px-4 py-2 rounded-full font-semibold text-xs focus:outline-none focus:border-[#00388d] focus:ring-1 focus:ring-[#00388d] w-32"
        />
        <datalist id="metodoPagoList">
          <option value="Contado" />
          <option value="Transferencia bancaria" />
          <option value="Depósito bancario" />
          <option value="Efectivo" />
          <option value="Tarjeta de crédito" />
          <option value="Tarjeta de débito" />
          <option value="Cheque" />
          <option value="Financiamiento bancario" />
          <option value="Crédito directo" />
          <option value="Arrendamiento" />
          <option value="Pago en parcialidades" />
          <option value="Mixto" />
        </datalist>

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
            estructuras={estructuras}
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

      {/* --- OBSERVACIONES DEL PDF --- */}
      <div className="space-y-2 pt-4">
        <label htmlFor="observaciones" className="block text-sm font-semibold text-gray-700">
          Observaciones del PDF
        </label>
        <textarea
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Una por línea"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] resize-none"
        />
        <p className="text-xs text-gray-500">Si lo dejas vacío se usan las de Configuración → Formato de Cotización</p>
      </div>

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
          onClick={onGuardar}
          disabled={guardando}
          className="border border-[#00388d] text-[#00388d] px-6 py-3 rounded-full text-sm font-bold hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer"
        >
          Continuar a Confirmación
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
        subtotalSinDescuento={subtotalGeneral}
        tipoMoneda={tipoMoneda}
      />

      <ModalCargosEditables
        isOpen={modalCargosOpen}
        onClose={() => setModalCargosOpen(false)}
        cargosEditables={cargosEditables}
        setCargosEditables={setCargosEditables}
      />
    </div>
  );
}
