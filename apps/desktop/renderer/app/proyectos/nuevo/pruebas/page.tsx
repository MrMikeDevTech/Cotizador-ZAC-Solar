'use client';

import { useState } from 'react';

// --- INTERFACES Y TIPOS ---
export type MetodoPrecio = 'unitario' | 'watt' | 'panel';
export type TipoMoneda = 'MXN' | 'USD';

export interface EstructuraInstalacion {
  id: string;
  nombre: string;
  precio: number;
}

export interface CargoEditable {
  id: string;
  nombre: string;
  monto: number;
}

export interface ConceptoCotizacion {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
}

// CATÁLOGO DE ESTRUCTURAS
const LISTA_ESTRUCTURAS: EstructuraInstalacion[] = [
  { id: 'teja', nombre: 'Teja', precio: 10800 },
  { id: 'contrapeso', nombre: 'Techo c/contra peso', precio: 7200 },
  { id: 'perforacion', nombre: 'Techo c/perforación', precio: 9000 },
  { id: 'asbesto', nombre: 'Lamina Asbesto', precio: 9000 },
  { id: 'angulo', nombre: 'Estructura Angulo aluminio', precio: 3600 },
  { id: 'ptr', nombre: 'Estructura PTR Galvanizado', precio: 3600 },
];

interface PasoOtrosCargosProps {
  conceptosIniciales?: ConceptoCotizacion[];
  onSiguiente?: () => void;
  onAnterior?: () => void;
}

export default function PasoOtrosCargos({
  conceptosIniciales,
  onSiguiente,
  onAnterior,
}: PasoOtrosCargosProps) {
  const pasoActivo = 4;

  // --- SELECCIÓN DE ESTRUCTURA ---
  const [estucturaSeleccionadaId, setEstructuraSeleccionadaId] = useState<string | null>('perforacion');

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
    conceptosIniciales || [
      { id: '1', concepto: 'Precio de paneles', costoBase: 13200, margenPorcentaje: 0 },
      { id: '2', concepto: 'Precio de inversores', costoBase: 21871.98, margenPorcentaje: 0 },
      { id: '3', concepto: 'Precio material eléctrico', costoBase: 3480, margenPorcentaje: 0 },
      { id: '4', concepto: 'Mano de obra', costoBase: 3600, margenPorcentaje: 0 },
    ]
  );

  // --- CÁLCULOS DINÁMICOS ---
  const estructuraActual = LISTA_ESTRUCTURAS.find(e => e.id === estucturaSeleccionadaId);
  const precioEstructura = estructuraActual ? estructuraActual.precio : 0;

  const calcularTotalConcepto = (item: ConceptoCotizacion): number => {
    return item.costoBase * (1 + item.margenPorcentaje / 100);
  };

  const calcularMargenMXN = (item: ConceptoCotizacion): number => {
    return item.costoBase * (item.margenPorcentaje / 100);
  };

  const subtotalConceptos: number = conceptos.reduce(
    (acc, curr) => acc + calcularTotalConcepto(curr), 0
  );

  const subtotalCargosEditables: number = cargosEditables.reduce(
    (acc, curr) => acc + (Number(curr.monto) || 0), 0
  );

  const subtotalGeneral: number = subtotalConceptos + subtotalCargosEditables + precioEstructura;
  
  let porcentajeDescuento = 0;
  if (descuento5) porcentajeDescuento += 5;
  if (descuento10) porcentajeDescuento += 10;

  const montoDescuento: number = subtotalGeneral * (porcentajeDescuento / 100);
  const subtotalConDescuento: number = subtotalGeneral - montoDescuento;

  const montoIVA: number = incluirIva ? subtotalConDescuento * 0.16 : 0;
  const granTotal: number = subtotalConDescuento + montoIVA;

  const utilidadTotalMXN: number = conceptos.reduce((acc, item) => acc + calcularMargenMXN(item), 0);
  const porcentajeUtilidadTotal: number = subtotalConceptos > 0 ? (utilidadTotalMXN / subtotalConceptos) * 100 : 0;

  // --- HANDLERS ---
  const handleToggleEstructura = (id: string) => {
    setEstructuraSeleccionadaId(prev => prev === id ? null : id);
  };

  const handleMargenPorcentajeChange = (id: string, nuevoMargen: number): void => {
    setConceptos(prev => prev.map(item => item.id === id ? { ...item, margenPorcentaje: nuevoMargen } : item));
  };

  const handleMargenMXNChange = (id: string, nuevoMargenMXN: number): void => {
    setConceptos(prev => prev.map(item => {
      if (item.id === id) {
        const nuevoPorcentaje = item.costoBase > 0 ? (nuevoMargenMXN / item.costoBase) * 100 : 0;
        return { ...item, margenPorcentaje: nuevoPorcentaje };
      }
      return item;
    }));
  };

  const handleAgregarCargo = (): void => {
    setCargosEditables(prev => [...prev, { id: Date.now().toString(), nombre: '', monto: 0 }]);
  };

  const handleEliminarCargo = (id: string): void => {
    setCargosEditables(prev => prev.filter(cargo => cargo.id !== id));
  };

  const handleUpdateCargo = (id: string, field: 'nombre' | 'monto', value: string | number): void => {
    setCargosEditables(prev => prev.map(cargo => cargo.id === id ? { ...cargo, [field]: value } : cargo));
  };

  const formatCurrency = (val: number): string => {
    return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tipoMoneda}`;
  };

  return (
    /* Fondo morado exacto (#8e94f2) sin marco cian intermedio */
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-6 md:p-10 relative h-max shadow-xl">
        
        <h2 className="text-2xl font-bold text-[#00388d] mb-8">Nuevo Proyecto</h2>

        {/* --- STEPPER --- */}
        <div className="flex flex-wrap justify-between items-center border-b border-gray-100 pb-4 mb-8 text-sm gap-4">
          {[
            { num: 1, label: 'Contacto' },
            { num: 2, label: 'Consumo' },
            { num: 3, label: 'Equipo' },
            { num: 4, label: 'Otros cargos' },
            { num: 5, label: 'Confirmación' }
          ].map((paso) => (
            <div key={paso.num} className={`flex items-center gap-2 ${pasoActivo === paso.num ? 'border-b-2 border-[#00388d] pb-2' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                pasoActivo === paso.num 
                  ? 'bg-[#00388d] text-white shadow-sm' 
                  : (pasoActivo > paso.num ? 'bg-[#8cc63f] text-white' : 'bg-gray-100 text-gray-400')
              }`}>
                {paso.num}
              </div>
              <span className={`font-medium ${pasoActivo === paso.num ? 'text-[#00388d] font-bold' : 'text-gray-400'}`}>
                Paso<br/>{paso.label}
              </span>
            </div>
          ))}
        </div>

        {/* --- BOTONES ACCIONES SUPERIORES --- */}
        <div className="flex flex-wrap justify-end gap-3 mb-6">
          <button 
            onClick={() => setModalPrecioOpen(true)}
            className="flex items-center gap-2 border border-[#2dd4bf] text-[#2dd4bf] hover:bg-teal-50 px-4 py-2 rounded-full font-semibold text-xs transition"
          >
            <span className="capitalize">
              {metodoPrecio === 'unitario' ? 'Precio unitario' : metodoPrecio === 'watt' ? 'Dólar por watt' : 'Dólar por panel'}
            </span>
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
          </button>

          <button 
            onClick={() => setModalAjustesOpen(true)}
            className="border border-[#2dd4bf] text-[#2dd4bf] hover:bg-teal-50 px-5 py-2 rounded-full font-semibold text-xs transition"
          >
            Ajustes extras
          </button>

          <button 
            onClick={() => setOpcionesAvanzadas(!opcionesAvanzadas)}
            className={`px-5 py-2 rounded-full font-semibold text-xs transition shadow-sm ${
              opcionesAvanzadas ? 'bg-[#00388d] text-white' : 'bg-[#2dd4bf] text-white hover:bg-teal-500'
            }`}
          >
            Opciones avanzadas
          </button>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* TARJETAS IZQUIERDAS */}
          <div className="lg:col-span-4 space-y-5">
            {/* 1. TIPO DE INSTALACIÓN */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-wider">Tipo de instalación</h4>
              <div className="space-y-2.5 max-h-48 overflow-y-auto text-xs text-gray-600">
                {LISTA_ESTRUCTURAS.map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={estucturaSeleccionadaId === item.id}
                      onChange={() => handleToggleEstructura(item.id)}
                      className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf] w-4 h-4 border-gray-300" 
                    />
                    <span className="text-gray-700 font-medium">{item.nombre}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. CARGOS */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm min-h-[100px]">
              <h4 className="font-bold text-gray-700 mb-2 text-xs uppercase tracking-wider">Cargos</h4>
            </div>

            {/* 3. CARGOS EDITABLES */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
              <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">Cargos Editables</span>
              <button 
                onClick={() => setModalCargosOpen(true)}
                className="w-7 h-7 bg-[#2dd4bf] text-white rounded-full flex items-center justify-center font-bold text-base hover:bg-teal-500 shadow transition"
              >
                +
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {/* TARJETA PRINCIPAL DE COTIZACIÓN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-[#00388d]">Revisa tu cotización</h3>
                <span className="text-xs text-gray-400 font-medium">1.63 dólar por watt</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] text-gray-400 uppercase border-b border-gray-100">
                      <th className="py-2 font-bold">CONCEPTO</th>
                      {opcionesAvanzadas && (
                        <>
                          <th className="py-2 text-center font-bold">% MARGEN</th>
                          <th className="py-2 text-right font-bold">MARGEN MXN</th>
                        </>
                      )}
                      <th className="py-2 text-right font-bold">TOTALES</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold text-gray-700 divide-y divide-gray-100">
                    {conceptos.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 text-gray-600">{item.concepto}</td>
                        {opcionesAvanzadas && (
                          <>
                            <td className="py-3 text-center">
                              <input 
                                type="number" 
                                value={Number(item.margenPorcentaje.toFixed(2))} 
                                onChange={(e) => handleMargenPorcentajeChange(item.id, Number(e.target.value))}
                                className="w-16 border border-gray-300 rounded p-1 text-xs text-center focus:outline-[#00388d] bg-white font-semibold"
                              />
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-gray-400">$</span>
                                <input 
                                  type="number" 
                                  value={Number(calcularMargenMXN(item).toFixed(2))} 
                                  onChange={(e) => handleMargenMXNChange(item.id, Number(e.target.value))}
                                  className="w-24 border border-gray-300 rounded p-1 text-xs text-right focus:outline-[#00388d] bg-white font-semibold text-gray-700"
                                />
                              </div>
                            </td>
                          </>
                        )}
                        <td className="py-3 text-right font-bold text-gray-700">
                          {formatCurrency(calcularTotalConcepto(item))}
                        </td>
                      </tr>
                    ))}

                    {/* ESTRUCTURA SELECCIONADA */}
                    {estructuraActual && (
                      <>
                        <tr>
                          <td className="pt-3 pb-1 font-semibold text-gray-600">Precio por tipo de estructura</td>
                          {opcionesAvanzadas && (
                            <>
                              <td className="pt-3 pb-1 text-center text-gray-300">-</td>
                              <td className="pt-3 pb-1 text-right text-gray-300">-</td>
                            </>
                          )}
                          <td className="pt-3 pb-1 text-right font-bold text-gray-700">
                            {formatCurrency(estructuraActual.precio)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={opcionesAvanzadas ? 4 : 2} className="pb-3 pt-0 text-xs font-semibold text-gray-500 pl-3">
                            <span className="text-[#00388d] mr-1">▶</span> {estructuraActual.nombre}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* CARGOS EDITABLES */}
                    {cargosEditables.map((cargo) => cargo.monto > 0 && (
                      <tr key={cargo.id}>
                        <td className="py-3 font-semibold text-gray-600">{cargo.nombre || 'Otro cargo'}</td>
                        {opcionesAvanzadas && (
                          <>
                            <td className="py-3 text-center text-gray-300">-</td>
                            <td className="py-3 text-right text-gray-300">-</td>
                          </>
                        )}
                        <td className="py-3 text-right font-bold text-gray-700">
                          {formatCurrency(cargo.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {opcionesAvanzadas && (
                <div className="flex justify-between items-center py-3 my-2 border-t border-b border-gray-100 text-xs font-bold text-gray-700">
                  <span>
                    UTILIDAD TOTAL <span className="text-[#2dd4bf] font-normal ml-2">{porcentajeUtilidadTotal.toFixed(2)}%</span>
                  </span>
                  <span className="text-[#2dd4bf]">{formatCurrency(utilidadTotalMXN)}</span>
                </div>
              )}

              <div className="mt-8 flex flex-col items-end gap-2 text-right">
                <div className="flex justify-between w-60 text-xs font-semibold">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-gray-700 font-bold">{formatCurrency(subtotalConDescuento)}</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 my-1">
                  <input 
                    type="checkbox" 
                    checked={incluirIva} 
                    onChange={(e) => setIncluirIva(e.target.checked)} 
                    className="rounded text-[#2dd4bf] focus:ring-[#2dd4bf]"
                  /> 
                  I.V.A. 16%
                </label>

                <div className="flex justify-between w-full pt-4 border-t border-gray-100 text-sm font-extrabold mt-2">
                  <span className="text-gray-600 text-xs self-center uppercase tracking-wider">GRAN TOTAL EN PESOS</span>
                  <span className="text-[#00388d] text-base">{formatCurrency(granTotal)}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN INFERIOR: TIPO DE CAMBIO */}
            <div className="mt-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tipo de cambio</label>
                  <select 
                    value={tipoMoneda} 
                    onChange={(e) => setTipoMoneda(e.target.value as TipoMoneda)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-700 focus:outline-[#00388d]"
                  >
                    <option value="MXN">Peso</option>
                    <option value="USD">Dólar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Valor de cambio del dólar</label>
                  <input 
                    type="number" 
                    value={valorDolar} 
                    step="0.01"
                    onChange={(e) => setValorDolar(Number(e.target.value))}
                    className="w-full bg-gray-100 border-none rounded-lg p-2 text-xs font-semibold text-gray-600 focus:outline-[#00388d]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={ocultarDesglose} 
                    onChange={(e) => setOcultarDesglose(e.target.checked)} 
                    className="rounded text-[#2dd4bf]"
                  /> 
                  Ocultar desglose de cotización
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* --- SIMULACIÓN DE FINANCIAMIENTO --- */}
        <div className="mt-8 pt-4">
          <h4 className="text-xs font-bold text-gray-500 mb-4 tracking-wider">
            Simulación de financiamiento
          </h4>
          <div className="flex justify-center items-center gap-6">
            <button className="border border-[#2dd4bf] text-[#00388d] bg-white px-8 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-teal-50 transition">
              SERFIMEX
            </button>
            <button className="border border-[#8cc63f] text-[#8cc63f] bg-white px-8 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-green-50 transition">
              redgirasol.
            </button>
          </div>
        </div>

        {/* --- NAVEGACIÓN INFERIOR --- */}
        <div className="flex justify-end items-center gap-6 pt-6 mt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={onAnterior}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={onSiguiente}
            className="bg-[#2dd4bf] text-white px-10 py-2.5 rounded-full text-xs font-bold shadow-md hover:bg-teal-500 transition"
          >
            Guardar
          </button>
        </div>

        {/* MODALES */}
        {modalPrecioOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setModalPrecioOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
              <h3 className="text-sm font-bold text-[#00388d] mb-4">Métodos de precio</h3>
              <div className="space-y-3 text-xs text-gray-600">
                {(['unitario', 'watt', 'panel'] as MetodoPrecio[]).map((met) => (
                  <label key={met} className="flex items-center gap-3 cursor-pointer capitalize">
                    <input 
                      type="radio" 
                      name="metodo" 
                      checked={metodoPrecio === met}
                      onChange={() => setMetodoPrecio(met)}
                      className="text-[#2dd4bf] focus:ring-[#2dd4bf]" 
                    />
                    {met === 'unitario' ? 'Precio unitario' : met === 'watt' ? 'Precio dólar por watt' : 'Precio dólar por panel'}
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setModalPrecioOpen(false)} className="px-5 py-1.5 border border-gray-300 text-gray-600 rounded-full font-semibold text-xs">Cancelar</button>
                <button onClick={() => setModalPrecioOpen(false)} className="px-6 py-1.5 bg-[#00388d] text-white rounded-full font-semibold text-xs shadow">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {modalAjustesOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setModalAjustesOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
              <h3 className="text-sm font-bold text-[#00388d] mb-4">Ajustes extras</h3>
              <div className="space-y-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-500">Aplicar descuento a cotización</p>
                <label className="flex justify-between items-center cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={descuento5} onChange={(e) => setDescuento5(e.target.checked)} className="rounded text-[#2dd4bf]" /> Pago en una sola exhibición
                  </span>
                  <span className="font-bold">5.00%</span>
                </label>
                <label className="flex justify-between items-center cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={descuento10} onChange={(e) => setDescuento10(e.target.checked)} className="rounded text-[#2dd4bf]" /> Pago en una sola exhibición
                  </span>
                  <span className="font-bold">10.00%</span>
                </label>
                <div className="pt-2">
                  <label className="block mb-1 text-gray-400">Precio del sistema con descuento</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={formatCurrency(subtotalConDescuento)}
                    className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-xs font-bold text-gray-700"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setModalAjustesOpen(false)} className="px-5 py-1.5 border border-gray-300 text-gray-600 rounded-full font-semibold text-xs">Cancelar</button>
                <button onClick={() => setModalAjustesOpen(false)} className="px-6 py-1.5 bg-[#00388d] text-white rounded-full font-semibold text-xs shadow">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {modalCargosOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
              <button onClick={() => setModalCargosOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
              <h3 className="text-sm font-bold text-[#00388d] mb-4">Cargos Editables</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cargosEditables.map((cargo) => (
                  <div key={cargo.id} className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <input 
                      type="text" 
                      placeholder="Nombre" 
                      value={cargo.nombre}
                      onChange={(e) => handleUpdateCargo(cargo.id, 'nombre', e.target.value)}
                      className="w-1/2 border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
                    />
                    <input 
                      type="number" 
                      placeholder="$ Monto (MXN)" 
                      value={cargo.monto || ''}
                      onChange={(e) => handleUpdateCargo(cargo.id, 'monto', Number(e.target.value))}
                      className="w-1/2 border-b border-gray-200 focus:border-[#00388d] outline-none text-xs p-1"
                    />
                    <button 
                      onClick={() => handleEliminarCargo(cargo.id)}
                      className="text-gray-400 hover:text-red-500 text-sm font-bold px-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleAgregarCargo}
                className="mt-3 text-xs text-[#2dd4bf] font-bold hover:underline"
              >
                + Agregar otro concepto
              </button>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setModalCargosOpen(false)} className="px-6 py-1.5 bg-[#00388d] text-white rounded-full font-semibold text-xs shadow">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}