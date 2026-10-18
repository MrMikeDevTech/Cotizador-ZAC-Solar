'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Stepper,
  Paso1Contacto,
  Paso2Consumo,
  Paso3Equipo,
  Paso4OtrosCargos,
  Paso5Confirmacion,
} from './components';
import {
  ConsumoPeriodo,
  DatosContacto,
  CargoEditable,
  ConceptoCotizacion,
  MetodoPrecio,
  TipoMoneda,
} from './types';
import { CONCEPTOS_COTIZACION_DEFECTO } from './constants';
import {
  calcularPromedios,
  calcularDimensionamiento,
  calcularTotalesCotizacion,
  recomendarPaquetes,
} from '@cotizador/shared';
import { useConfiguracion } from '../../../lib/ConfiguracionContext';
import { api } from '../../../lib/api';
import { useGuardarProyecto } from './hooks/useGuardarProyecto';
import { useTarifasCfe } from './hooks/useTarifasCfe';

export default function NuevoProyecto() {
  const { paneles, inversores, estructuras, factores, tarifas } = useConfiguracion();

  // --- CONTROL DE PASO ---
  const [pasoActivo, setPasoActivo] = useState(1);
  const [cargandoProyecto, setCargandoProyecto] = useState(false);

  // --- ESTADOS PASO 1: CONTACTO ---
  const [datosContacto, setDatosContacto] = useState<DatosContacto>({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    celular: '',
    email: '',
    estado: '',
    localidad: '',
    fuenteContacto: '',
    estatus: '',
    notas: '',
    mostrarEmpresariales: false,
    empresariales: {
      rfc: '',
      cargo: '',
      razonSocial: '',
      actividadComercial: '',
    },
  });

  const handleActualizarDatosContacto = (nuevosDatos: Partial<DatosContacto>) => {
    setDatosContacto((prev) => ({ ...prev, ...nuevosDatos }));
  };

  // --- ESTADOS PASO 2: CONSUMO ---
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [localidadConsumo, setLocalidadConsumo] = useState('Nayarit - Compostela');
  const [hilos, setHilos] = useState('1 hilo');
  const [nombreRecibo, setNombreRecibo] = useState('');
  const [numeroServicio, setNumeroServicio] = useState('');
  // 0 por defecto: el suministro eléctrico de uso **doméstico** (tarifas 1,
  // 1A-1F y DAC) no causa IVA. Con el 16 % que había antes, el pago calculado
  // salía un 16 % por encima del recibo real. Sigue siendo editable para los
  // casos en que sí aplique (p. ej. un servicio comercial como PDBT).
  const [ivaCFE, setIvaCFE] = useState(0);
  const [porcentajeDap, setPorcentajeDap] = useState('');
  const [usarNuevaTarifa, setUsarNuevaTarifa] = useState(false);
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState('1A');
  const [aplicarDac, setAplicarDac] = useState(false);
  const [aplicarDap, setAplicarDap] = useState(false);

  const [fechaTexto, setFechaTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [periodo, setPeriodo] = useState('Bimestral');

  const [consumos, setConsumos] = useState<ConsumoPeriodo[]>(
    Array.from({ length: 6 }, () => ({ inicioStr: '', terminoStr: '', kwh: '', pago: '' }))
  );
  // Apagado por defecto: el pago se captura a mano, copiándolo del recibo que
  // tiene el cliente delante. El cálculo con la tarifa de CFE se activa con el
  // check cuando se quiera, pero no decide por su cuenta.
  const [calcularPagoAuto, setCalcularPagoAuto] = useState(false);

  // --- ESTADOS PASO 3: EQUIPO ---
  const [panelKey, setPanelKey] = useState('');
  const [cantPaneles, setCantPaneles] = useState<number | ''>('');
  const [inversorKey, setInversorKey] = useState('');
  const [cantInversores, setCantInversores] = useState<number | ''>('');

  // Promedios calculados a partir de los consumos del Paso 2
  const { consumoPromedioKwh, pagoPromedioCFE } = useMemo(
    () => calcularPromedios(consumos),
    [consumos]
  );

  // Dimensionamiento del Paso 3: valor **derivado**, no estado.
  //
  // Antes esto era un `useEffect` que volcaba el resultado en cinco `useState`
  // distintos. Eso costaba un render extra por cada cambio y, peor, dejaba una
  // ventana en la que los cinco valores correspondían al consumo anterior: lo
  // que se mostraba en pantalla iba un render por detrás de lo capturado.
  const { tamanoSistema, produccion, autoconsumo, nuevoPago, ahorro } = useMemo(
    () =>
      calcularDimensionamiento({
        panel: paneles[panelKey],
        cantPaneles: Number(cantPaneles) || 0,
        consumoPromedioKwh,
        pagoPromedioCFE,
        factores,
      }),
    [paneles, panelKey, cantPaneles, consumoPromedioKwh, pagoPromedioCFE, factores]
  );

  // --- ESTADOS PASO 4: OTROS CARGOS & COTIZACIÓN ---
  const [estructuraSeleccionadaId, setEstructuraSeleccionadaId] = useState<string | null>(null);
  const [metodoPrecio, setMetodoPrecio] = useState<MetodoPrecio>('unitario');
  const [opcionesAvanzadas, setOpcionesAvanzadas] = useState<boolean>(false);
  const [incluirIva, setIncluirIva] = useState<boolean>(false);
  const [tipoMoneda, setTipoMoneda] = useState<TipoMoneda>('MXN');
  const [valorDolar, setValorDolar] = useState<number>(16.90);
  const [ocultarDesglose, setOcultarDesglose] = useState<boolean>(false);

  const [descuento5, setDescuento5] = useState<boolean>(false);
  const [descuento10, setDescuento10] = useState<boolean>(false);
  const [cargosEditables, setCargosEditables] = useState<CargoEditable[]>([]);

  const [conceptos, setConceptos] = useState<ConceptoCotizacion[]>(CONCEPTOS_COTIZACION_DEFECTO);

  // Costo de paneles e inversores según el equipo elegido en el Paso 3.
  //
  // Antes aquí había dos precios escritos a mano (4400 y 13500) que coincidían
  // con los de la semilla, razón por la que el error pasó desapercibido: al
  // cambiar el precio de un panel en Configuración → Catálogo, la cotización
  // seguía usando el valor viejo. Ahora se toma `precioUnitario` del catálogo
  // real, que es también el que usa la recomendación del Paso 3 — si no
  // coincidieran, las tarjetas dirían un número y la cotización otro.
  useEffect(() => {
    const numPaneles = Number(cantPaneles) || 0;
    const numInversores = Number(cantInversores) || 0;
    const precioPanel = paneles[panelKey]?.precioUnitario ?? 0;
    const precioInversor = inversores[inversorKey]?.precioUnitario ?? 0;

    setConceptos((prev) => {
      const siguiente = prev.map((c) => {
        if (c.id === '1' && numPaneles > 0 && precioPanel > 0) {
          return { ...c, costoBase: numPaneles * precioPanel };
        }
        if (c.id === '2' && numInversores > 0 && precioInversor > 0) {
          return { ...c, costoBase: numInversores * precioInversor };
        }
        return c;
      });

      // Devolver la misma referencia cuando nada cambió evita un render extra
      // por cada tecleo en cualquier otro campo del wizard.
      return siguiente.some((c, i) => c.costoBase !== prev[i]?.costoBase) ? siguiente : prev;
    });
  }, [cantPaneles, cantInversores, panelKey, inversorKey, paneles, inversores]);

  // Cálculos dinámicos de cotización compartidos entre Paso 4 y Paso 5
  const estructuraActual = useMemo(
    () => estructuras.find((e) => e.id === estructuraSeleccionadaId),
    [estructuraSeleccionadaId, estructuras]
  );
  const precioEstructura = estructuraActual ? estructuraActual.precio : 0;

  // Recomendación automática de paquetes para las tarjetas del Paso 3.
  //
  // `paneles`/`inversores` del wizard (ver `./types`) traen `clave` y
  // `precioUnitario` pero NO `activo`/`orden`, que sí exige el `PanelData` /
  // `InversorData` de `packages/shared` (consumidos por `recomendarPaquetes`
  // para filtrar catálogo inactivo y para desempatar candidatos). Los datos
  // reales (API o catálogo de respaldo) no tienen noción de "inactivo" en
  // esta capa — el backend ya filtra lo que expone en `/api/config` — así
  // que `activo: true` es siempre correcto aquí; `orden` solo se usa como
  // desempate estable y el orden de iteración de `Object.values` es un
  // criterio tan válido como cualquier otro. Se completa en el punto de
  // llamada en vez de tocar los tipos de `packages/shared` o los del wizard.
  const recomendacionEquipo = useMemo(
    () =>
      recomendarPaquetes({
        paneles: Object.values(paneles).map((panel, indice) => ({ ...panel, activo: true, orden: indice })),
        inversores: Object.values(inversores).map((inversor, indice) => ({
          ...inversor,
          activo: true,
          orden: indice,
        })),
        consumoPromedioKwh,
        pagoPromedioCFE,
        factores,
        costos: { costoFijo: precioEstructura },
      }),
    [paneles, inversores, consumoPromedioKwh, pagoPromedioCFE, factores, precioEstructura]
  );

  const totalesCotizacion = useMemo(
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
  const { subtotalConDescuento, granTotal } = totalesCotizacion;

  // Línea de "límite DAC" de la gráfica de proyección: monto real derivado de la
  // tarifa contratada, en vez del valor hardcodeado que tenía antes GraficaProyeccion.
  const limiteDacKwh = useMemo(
    () => tarifas.find((t) => t.codigo === tarifaSeleccionada)?.limiteDac ?? null,
    [tarifas, tarifaSeleccionada]
  );
  const costoPromedioKwh = consumoPromedioKwh > 0 ? pagoPromedioCFE / consumoPromedioKwh : 0;

  // Tarifas reales de CFE (packages/shared: calcularImporteCfe + calcularDetalleRetornoInversion).
  // Si falta algún escalón (localidad sin resolver, periodo sin capturar, tarifa sin
  // escalonamiento como DAC, o el backend sin ese mes todavía), el wizard sigue
  // funcionando con el respaldo offline (promedio pago/kWh histórico) y Paso 5 avisa
  // que el cálculo es aproximado.
  const {
    escalonesPorPeriodo,
    completo: tarifasCompletas,
    cargando: cargandoTarifas,
  } = useTarifasCfe(
    consumos,
    localidadConsumo,
    tarifaSeleccionada
  );
  const calculoAproximado = consumoPromedioKwh > 0 && !cargandoTarifas && !tarifasCompletas;

  // --- GUARDADO CONTRA EL BACKEND ---
  const { proyectoId, setProyectoId, guardando, error: errorGuardado, guardar } = useGuardarProyecto();

  const datosParaGuardar = () => ({
    datosContacto,
    nombreProyecto,
    localidadConsumo,
    hilos,
    nombreRecibo,
    numeroServicio,
    ivaCFE,
    porcentajeDap,
    usarNuevaTarifa,
    tarifaSeleccionada,
    aplicarDac,
    aplicarDap,
    fechaInicio,
    periodo,
    consumos,
    panelKey,
    cantPaneles,
    inversorKey,
    cantInversores,
    estructuraSeleccionadaId,
    metodoPrecio,
    incluirIva,
    tipoMoneda,
    valorDolar,
    ocultarDesglose,
    descuento5,
    descuento10,
    cargosEditables,
    conceptos,
    pasoActual: pasoActivo,
  });

  // Guardar sin avisar hacía que los botones parecieran muertos: el proyecto
  // se persistía pero en pantalla no cambiaba nada. El aviso es la única
  // señal de que funcionó, porque el wizard se queda donde está.
  const handleGuardarBorrador = async () => {
    try {
      await guardar(datosParaGuardar(), 'borrador');
      toast.success('Borrador guardado.');
    } catch {
      // `guardar` ya deja el motivo en `errorGuardado`, que se pinta en pantalla.
      toast.error('No se pudo guardar el borrador.');
    }
  };

  const handleCrearProyecto = async () => {
    const esNuevo = !proyectoId;
    try {
      await guardar(datosParaGuardar(), 'cotizado');
      toast.success(esNuevo ? 'Proyecto creado.' : 'Proyecto guardado.');
    } catch {
      toast.error(esNuevo ? 'No se pudo crear el proyecto.' : 'No se pudo guardar el proyecto.');
    }
  };

  // --- REHIDRATACIÓN DE UN PROYECTO EXISTENTE (?id=) ---
  useEffect(() => {
    const idProyecto = new URLSearchParams(window.location.search).get('id');
    if (!idProyecto) return;

    setCargandoProyecto(true);
    api
      .get<any>(`/api/proyectos/${idProyecto}`)
      .then((proyecto) => {
        setProyectoId(proyecto.id);
        setDatosContacto({
          nombre: proyecto.contacto.nombre,
          apellidoPaterno: proyecto.contacto.apellidoPaterno,
          apellidoMaterno: proyecto.contacto.apellidoMaterno,
          telefono: proyecto.contacto.telefono,
          celular: proyecto.contacto.celular,
          email: proyecto.contacto.email,
          estado: proyecto.contacto.estado,
          localidad: proyecto.contacto.localidad,
          fuenteContacto: proyecto.contacto.fuenteContacto,
          estatus: proyecto.contacto.estatus,
          notas: proyecto.contacto.notas,
          mostrarEmpresariales: proyecto.contacto.esEmpresa,
          empresariales: {
            rfc: proyecto.contacto.rfc,
            cargo: proyecto.contacto.cargo,
            razonSocial: proyecto.contacto.razonSocial,
            actividadComercial: proyecto.contacto.actividadComercial,
          },
        });
        setNombreProyecto(proyecto.nombre);
        setLocalidadConsumo(proyecto.localidadConsumo);
        setHilos(proyecto.hilos);
        setNombreRecibo(proyecto.nombreRecibo);
        setNumeroServicio(proyecto.numeroServicio);
        setIvaCFE(proyecto.ivaCfe);
        setPorcentajeDap(proyecto.porcentajeDap);
        setUsarNuevaTarifa(proyecto.usarNuevaTarifa);
        setTarifaSeleccionada(proyecto.tarifa);
        setAplicarDac(proyecto.aplicarDac);
        setAplicarDap(proyecto.aplicarDap);
        setFechaInicio(proyecto.fechaInicio);
        setPeriodo(proyecto.periodo);
        setConsumos(
          proyecto.consumos.map((c: any) => ({
            inicioStr: c.inicioStr,
            terminoStr: c.terminoStr,
            kwh: String(c.kwh),
            pago: String(c.pago),
          }))
        );

        // Al abrir un proyecto guardado se fuerza el cálculo manual aunque el
        // check estuviera activado: sus pagos son los que se cotizaron en su
        // día, y recalcularlos con las tarifas de hoy alteraría una cotización
        // ya entregada al cliente.
        setCalcularPagoAuto(false);

        const cotizacion = proyecto.cotizaciones[0];
        if (cotizacion) {
          setPanelKey(cotizacion.panelClave);
          setCantPaneles(cotizacion.cantPaneles);
          setInversorKey(cotizacion.inversorClave);
          setCantInversores(cotizacion.cantInversores);
          setEstructuraSeleccionadaId(cotizacion.estructuraId);
          setMetodoPrecio(cotizacion.metodoPrecio);
          setIncluirIva(cotizacion.incluirIva);
          setTipoMoneda(cotizacion.tipoMoneda);
          setValorDolar(cotizacion.valorDolar);
          setOcultarDesglose(cotizacion.ocultarDesglose);
          setDescuento5(cotizacion.descuento5);
          setDescuento10(cotizacion.descuento10);
          setCargosEditables(cotizacion.cargos.map((c: any) => ({ id: c.id, nombre: c.nombre, monto: c.monto })));
          setConceptos(
            cotizacion.conceptos.map((c: any) => ({
              id: c.id,
              concepto: c.concepto,
              costoBase: c.costoBase,
              margenPorcentaje: c.margenPorcentaje,
            }))
          );
        }

        setPasoActivo(proyecto.pasoActual || 1);
      })
      .catch(() => {
        // si no se puede cargar (backend caído o id inválido), el wizard sigue usable en blanco
      })
      .finally(() => setCargandoProyecto(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        <h2 className="text-2xl font-bold text-[#00388d] mb-8">
          Nuevo Proyecto
          {cargandoProyecto && <span className="ml-3 text-xs font-normal text-gray-400">Cargando proyecto…</span>}
        </h2>

        {/* --- INDICADOR DE PASOS (Stepper) --- */}
        <Stepper pasoActivo={pasoActivo} onCambiarPaso={setPasoActivo} />

        {/* --- PASO 1: CONTACTO --- */}
        {pasoActivo === 1 && (
          <Paso1Contacto
            datosContacto={datosContacto}
            onActualizarDatos={handleActualizarDatosContacto}
            onSiguiente={() => setPasoActivo(2)}
          />
        )}

        {/* --- PASO 2: CONSUMO --- */}
        {pasoActivo === 2 && (
          <Paso2Consumo
            nombreProyecto={nombreProyecto}
            setNombreProyecto={setNombreProyecto}
            localidadConsumo={localidadConsumo}
            setLocalidadConsumo={setLocalidadConsumo}
            hilos={hilos}
            setHilos={setHilos}
            nombreRecibo={nombreRecibo}
            setNombreRecibo={setNombreRecibo}
            numeroServicio={numeroServicio}
            setNumeroServicio={setNumeroServicio}
            ivaCFE={ivaCFE}
            setIvaCFE={setIvaCFE}
            porcentajeDap={porcentajeDap}
            setPorcentajeDap={setPorcentajeDap}
            usarNuevaTarifa={usarNuevaTarifa}
            setUsarNuevaTarifa={setUsarNuevaTarifa}
            tarifaSeleccionada={tarifaSeleccionada}
            setTarifaSeleccionada={setTarifaSeleccionada}
            aplicarDac={aplicarDac}
            setAplicarDac={setAplicarDac}
            aplicarDap={aplicarDap}
            setAplicarDap={setAplicarDap}
            fechaTexto={fechaTexto}
            setFechaTexto={setFechaTexto}
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            periodo={periodo}
            setPeriodo={setPeriodo}
            consumos={consumos}
            setConsumos={setConsumos}
            calcularPagoAuto={calcularPagoAuto}
            setCalcularPagoAuto={setCalcularPagoAuto}
            escalonesPorPeriodo={escalonesPorPeriodo}
            cargandoTarifas={cargandoTarifas}
            tarifasDelPeriodo={tarifasCompletas}
            pagoMinimoCfe={factores.pagoMinimoCfe}
            onAnterior={() => setPasoActivo(1)}
            onSiguiente={() => setPasoActivo(3)}
          />
        )}

        {/* --- PASO 3: EQUIPO --- */}
        {pasoActivo === 3 && (
          <Paso3Equipo
            panelKey={panelKey}
            setPanelKey={setPanelKey}
            cantPaneles={cantPaneles}
            setCantPaneles={setCantPaneles}
            inversorKey={inversorKey}
            setInversorKey={setInversorKey}
            cantInversores={cantInversores}
            setCantInversores={setCantInversores}
            tamanoSistema={tamanoSistema}
            produccion={produccion}
            autoconsumo={autoconsumo}
            nuevoPago={nuevoPago}
            ahorro={ahorro}
            pagoPromedioCFE={pagoPromedioCFE}
            consumos={consumos}
            paneles={paneles}
            inversores={inversores}
            limiteDacKwh={limiteDacKwh}
            costoPromedioKwh={costoPromedioKwh}
            recomendacionEquipo={recomendacionEquipo}
            onAnterior={() => setPasoActivo(2)}
            onSiguiente={() => setPasoActivo(4)}
          />
        )}

        {/* --- PASO 4: OTROS CARGOS --- */}
        {pasoActivo === 4 && (
          <Paso4OtrosCargos
            estructuras={estructuras}
            estructuraSeleccionadaId={estructuraSeleccionadaId}
            setEstructuraSeleccionadaId={setEstructuraSeleccionadaId}
            metodoPrecio={metodoPrecio}
            setMetodoPrecio={setMetodoPrecio}
            opcionesAvanzadas={opcionesAvanzadas}
            setOpcionesAvanzadas={setOpcionesAvanzadas}
            incluirIva={incluirIva}
            setIncluirIva={setIncluirIva}
            tipoMoneda={tipoMoneda}
            setTipoMoneda={setTipoMoneda}
            valorDolar={valorDolar}
            setValorDolar={setValorDolar}
            ocultarDesglose={ocultarDesglose}
            setOcultarDesglose={setOcultarDesglose}
            descuento5={descuento5}
            setDescuento5={setDescuento5}
            descuento10={descuento10}
            setDescuento10={setDescuento10}
            cargosEditables={cargosEditables}
            setCargosEditables={setCargosEditables}
            conceptos={conceptos}
            setConceptos={setConceptos}
            onAnterior={() => setPasoActivo(3)}
            onSiguiente={() => setPasoActivo(5)}
          />
        )}

        {/* --- PASO 5: CONFIRMACIÓN --- */}
        {pasoActivo === 5 && (
          <Paso5Confirmacion
            datosContacto={datosContacto}
            nombreProyecto={nombreProyecto}
            nombreRecibo={nombreRecibo}
            tarifaSeleccionada={tarifaSeleccionada}
            numeroServicio={numeroServicio}
            periodo={periodo}
            consumos={consumos}
            consumoPromedioKwh={consumoPromedioKwh}
            pagoPromedioCFE={pagoPromedioCFE}
            panelKey={panelKey}
            cantPaneles={cantPaneles}
            inversorKey={inversorKey}
            cantInversores={cantInversores}
            tamanoSistema={tamanoSistema}
            produccion={produccion}
            autoconsumo={autoconsumo}
            nuevoPago={nuevoPago}
            ahorro={ahorro}
            conceptos={conceptos}
            estructuraActual={estructuraActual}
            cargosEditables={cargosEditables}
            subtotalConDescuento={subtotalConDescuento}
            granTotal={granTotal}
            incluirIva={incluirIva}
            tipoMoneda={tipoMoneda}
            limiteDacKwh={limiteDacKwh}
            costoPromedioKwh={costoPromedioKwh}
            pagoMinimoCfe={factores.pagoMinimoCfe}
            factoresEstacionales={factores.factoresEstacionales}
            escalonesPorPeriodo={escalonesPorPeriodo}
            calculoAproximado={calculoAproximado}
            proyectoId={proyectoId}
            guardando={guardando}
            errorGuardado={errorGuardado}
            onAnterior={() => setPasoActivo(4)}
            onGuardarBorrador={handleGuardarBorrador}
            onFinalizar={handleCrearProyecto}
          />
        )}
      </div>
    </div>
  );
}