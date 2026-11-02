'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  EstructuraInstalacion,
  MetodoPrecio,
  TipoMoneda,
} from './types';
import { CONCEPTOS_COTIZACION_DEFECTO } from './constants';
import {
  calcularPromedios,
  calcularDimensionamiento,
  calcularTotalesCotizacion,
  METODO_PAGO_POR_DEFECTO,
  normalizarMetodoPago,
  normalizarTipoEquipoInversor,
  recomendarPaquetes,
  type ResultadoReciboCfe,
  type TipoEquipoInversor,
} from '@cotizador/shared';
import { useConfiguracion } from '../../../lib/ConfiguracionContext';
import { api } from '../../../lib/api';
import CargarReciboCfe from './components/CargarReciboCfe';
import { construirAutocompletado, type PlanAutocompletado } from './utils/autocompletarRecibo';
import { etiquetasDePeriodo } from './utils/periodos';
import { esConceptoDeInversores, esConceptoDePaneles, precioBasePorPanel } from './utils/conceptosEquipo';
import { useGuardarProyecto } from './hooks/useGuardarProyecto';
import { useTarifasCfe } from './hooks/useTarifasCfe';

export default function NuevoProyecto() {
  const { paneles, inversores, estructuras: estructurasCatalogo, factores, tarifas, localidades } = useConfiguracion();

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

  // Los campos del Paso 1 no son controlados (`defaultValue`), así que cambiar
  // `datosContacto` desde fuera no los refresca. Subir este contador cambia la
  // `key` de `Paso1Contacto`, lo remonta y lo hace releer los datos nuevos.
  const [claveContacto, setClaveContacto] = useState(0);

  // --- ESTADOS PASO 2: CONSUMO ---
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [localidadConsumo, setLocalidadConsumo] = useState('Nayarit - Compostela');
  const [hilos, setHilos] = useState('1 hilo');
  const [nombreRecibo, setNombreRecibo] = useState('');
  const [numeroServicio, setNumeroServicio] = useState('');
  // Del recibo CFE; no tienen campo en el wizard, se editan en el modal de la Carta Poder.
  const [direccion, setDireccion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [numeroMedidor, setNumeroMedidor] = useState('');
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
  // "Inversor" o "Microinversor": decide el texto de las garantías del PDF.
  const [tipoEquipoInversor, setTipoEquipoInversor] = useState<TipoEquipoInversor>('Inversor');

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
  const [metodoPago, setMetodoPago] = useState<string>(METODO_PAGO_POR_DEFECTO);
  const [observaciones, setObservaciones] = useState<string>('');
  const [opcionesAvanzadas, setOpcionesAvanzadas] = useState<boolean>(false);
  const [incluirIva, setIncluirIva] = useState<boolean>(false);
  const [tipoMoneda, setTipoMoneda] = useState<TipoMoneda>('MXN');
  const [valorDolar, setValorDolar] = useState<number>(16.90);
  const [ocultarDesglose, setOcultarDesglose] = useState<boolean>(false);

  const [descuento5, setDescuento5] = useState<boolean>(false);
  const [descuento10, setDescuento10] = useState<boolean>(false);
  const [cargosEditables, setCargosEditables] = useState<CargoEditable[]>([]);

  const [conceptos, setConceptos] = useState<ConceptoCotizacion[]>(CONCEPTOS_COTIZACION_DEFECTO);

  // Firma del equipo con el que se guardó el proyecto abierto; `null` en uno nuevo.
  const equipoGuardadoRef = useRef<string | null>(null);
  const ultimaFirmaCostosRef = useRef<string | null>(null);

  // Estructura de la cotización guardada, con el precio de entonces. El catálogo puede
  // haber cambiado (o haberla quitado) desde que se cotizó; ese precio es el que manda.
  const [estructuraGuardada, setEstructuraGuardada] = useState<EstructuraInstalacion | null>(null);
  const estructuras = useMemo(() => {
    if (!estructuraGuardada) return estructurasCatalogo;
    const hayEnCatalogo = estructurasCatalogo.some((e) => e.id === estructuraGuardada.id);
    return hayEnCatalogo
      ? estructurasCatalogo.map((e) =>
          e.id === estructuraGuardada.id ? { ...e, precio: estructuraGuardada.precio } : e
        )
      : [...estructurasCatalogo, estructuraGuardada];
  }, [estructurasCatalogo, estructuraGuardada]);

  // Costo de paneles e inversores según el equipo elegido en el Paso 3.
  //
  // Antes aquí había dos precios escritos a mano (4400 y 13500) que coincidían
  // con los de la semilla, razón por la que el error pasó desapercibido: al
  // cambiar el precio de un panel en Configuración → Catálogo, la cotización
  // seguía usando el valor viejo. Ahora se toma `precioUnitario` del catálogo
  // real, que es también el que usa la recomendación del Paso 3 — si no
  // coincidieran, las tarjetas dirían un número y la cotización otro.
  //
  // Los dos conceptos se reconocen por su id de plantilla ('1' y '2', proyecto
  // nuevo) o por su nombre (proyecto reabierto: ahí los ids son los de la base).
  //
  // Un proyecto reabierto conserva los costos con los que se cotizó: mientras el
  // equipo y las cantidades sigan siendo los guardados (`equipoGuardadoRef`) no se
  // recalcula nada, ni al abrirlo ni cuando el catálogo se revalida. En cuanto el
  // asesor cambia modelo o cantidad, se recalcula con el catálogo vigente.
  useEffect(() => {
    const numPaneles = Number(cantPaneles) || 0;
    const numInversores = Number(cantInversores) || 0;

    const firmaEquipo = `${panelKey}|${numPaneles}|${inversorKey}|${numInversores}`;
    if (equipoGuardadoRef.current !== null) {
      if (equipoGuardadoRef.current === firmaEquipo) return;
      equipoGuardadoRef.current = null;
    }

    const precioPanel = paneles[panelKey]?.precioUnitario ?? 0;
    const precioInversor = inversores[inversorKey]?.precioUnitario ?? 0;

    // Solo se recalcula cuando cambia el equipo, la cantidad o un precio del catálogo.
    // Si no, cada revalidación del catálogo (al volver a la ventana) pisaría los
    // costos que el asesor ajustó a mano en las opciones avanzadas del Paso 4.
    const firma = `${firmaEquipo}|${precioPanel}|${precioInversor}`;
    if (ultimaFirmaCostosRef.current === firma) return;
    ultimaFirmaCostosRef.current = firma;

    setConceptos((prev) => {
      const siguiente = prev.map((c) => {
        if (esConceptoDePaneles(c) && numPaneles > 0 && precioPanel > 0) {
          return { ...c, costoBase: numPaneles * precioPanel };
        }
        if (esConceptoDeInversores(c) && numInversores > 0 && precioInversor > 0) {
          return { ...c, costoBase: numInversores * precioInversor };
        }
        // Material eléctrico, mano de obra y estructura de aluminio: precio por panel × paneles.
        const porPanel = precioBasePorPanel(c);
        if (porPanel !== null && numPaneles > 0) {
          return { ...c, costoBase: numPaneles * porPanel };
        }
        return c;
      });

      // Devolver la misma referencia cuando nada cambió evita un render extra
      // por cada tecleo en cualquier otro campo del wizard.
      return siguiente.some((c, i) => c.costoBase !== prev[i]?.costoBase) ? siguiente : prev;
    });
  }, [cantPaneles, cantInversores, panelKey, inversorKey, paneles, inversores]);

  // Si el asesor elige otra estructura, el precio congelado de la anterior deja de
  // aplicar (el backend tampoco lo conserva: solo lo hace mientras sea la misma).
  useEffect(() => {
    if (estructuraGuardada && estructuraSeleccionadaId !== estructuraGuardada.id) {
      setEstructuraGuardada(null);
    }
  }, [estructuraGuardada, estructuraSeleccionadaId]);

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
    direccion,
    codigoPostal,
    numeroMedidor,
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
    tipoEquipoInversor,
    estructuraSeleccionadaId,
    metodoPrecio,
    metodoPago,
    observaciones,
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

  /**
   * Vuelca en los Pasos 1 y 2 lo leído de un recibo CFE.
   *
   * Todos los `setX` van en un mismo manejador, así que React los aplica en un
   * solo render; aun así el **orden** importa por los efectos de `Paso2Consumo`:
   * - La tarifa se asigna después del checkbox de "tarifa nueva", que decide
   *   qué lista de tarifas se ofrece.
   * - `fechaInicio`, `fechaTexto` y `periodo` van antes que los consumos: al
   *   cambiar fecha o periodo, el paso regenera las etiquetas de las 6 filas
   *   conservando kWh y pago, de modo que los consumos se ponen sobre filas
   *   que ya llevan sus etiquetas y nada los vuelve a tocar.
   * - `calcularPagoAuto` se apaga: ese efecto sobrescribe el pago de cada fila
   *   con la tarifa teórica, y lo que importa aquí es el importe real del recibo.
   */
  const handleReciboLeido = (resultado: ResultadoReciboCfe): PlanAutocompletado => {
    const plan = construirAutocompletado(resultado, localidades);

    // Paso 1
    handleActualizarDatosContacto(plan.contacto);
    setClaveContacto((clave) => clave + 1);

    // Paso 2: identificación del servicio
    setNombreProyecto(plan.nombreProyecto);
    setNombreRecibo(plan.nombreRecibo);
    setNumeroServicio(plan.numeroServicio);
    setDireccion(plan.direccion);
    setCodigoPostal(plan.codigoPostal);
    setNumeroMedidor(plan.numeroMedidor);
    if (plan.hilos) setHilos(plan.hilos);
    if (plan.localidadConsumo) setLocalidadConsumo(plan.localidadConsumo);
    if (plan.usarNuevaTarifa !== null && plan.tarifa) {
      setUsarNuevaTarifa(plan.usarNuevaTarifa);
      setTarifaSeleccionada(plan.tarifa);
    }

    // Paso 2: fechas y periodo primero, consumos después
    const periodoFinal = plan.periodo ?? periodo;
    if (plan.fechaInicio && plan.fechaTexto) {
      setFechaInicio(plan.fechaInicio);
      setFechaTexto(plan.fechaTexto);
    }
    if (plan.periodo) setPeriodo(plan.periodo);

    setCalcularPagoAuto(false);
    if (plan.consumos.length > 0) {
      setConsumos((prev) =>
        prev.map((fila, i) => {
          const consumo = plan.consumos[i];
          // Las filas que el recibo no trajo se limpian, para no mezclar datos de dos recibos.
          const datosFila = consumo ?? { kwh: '', pago: '' };
          const etiquetas = plan.fechaInicio ? etiquetasDePeriodo(plan.fechaInicio, periodoFinal, i) : null;
          return { ...fila, ...etiquetas, ...datosFila };
        })
      );
    }

    return plan;
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
        setDireccion(proyecto.direccion ?? '');
        setCodigoPostal(proyecto.codigoPostal ?? '');
        setNumeroMedidor(proyecto.numeroMedidor ?? '');
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
          equipoGuardadoRef.current = `${cotizacion.panelClave}|${Number(cotizacion.cantPaneles) || 0}|${cotizacion.inversorClave}|${Number(cotizacion.cantInversores) || 0}`;
          if (cotizacion.estructuraId) {
            setEstructuraGuardada({
              id: cotizacion.estructuraId,
              nombre: cotizacion.estructuraNombre,
              precio: cotizacion.estructuraPrecio,
            });
          }
          setPanelKey(cotizacion.panelClave);
          setCantPaneles(cotizacion.cantPaneles);
          setInversorKey(cotizacion.inversorClave);
          setCantInversores(cotizacion.cantInversores);
          setTipoEquipoInversor(normalizarTipoEquipoInversor(cotizacion.tipoEquipoInversor));
          setEstructuraSeleccionadaId(cotizacion.estructuraId);
          setMetodoPrecio(cotizacion.metodoPrecio);
          setMetodoPago(normalizarMetodoPago(cotizacion.metodoPago));
          setObservaciones(cotizacion.observaciones ?? '');
          setIncluirIva(cotizacion.incluirIva);
          setTipoMoneda(cotizacion.tipoMoneda);
          setValorDolar(cotizacion.valorDolar);
          setOcultarDesglose(cotizacion.ocultarDesglose);
          setDescuento5(cotizacion.descuento5);
          setDescuento10(cotizacion.descuento10);
          setCargosEditables(cotizacion.cargos.map((c: any) => ({ id: c.id, nombre: c.nombre, monto: c.monto, margenPorcentaje: c.margenPorcentaje ?? 0 })));
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
          <>
            {/* Fuera de Paso1Contacto a propósito: ese componente se remonta tras cada
                autocompletado y arrastraría el mensaje de resultado. */}
            <CargarReciboCfe onReciboLeido={handleReciboLeido} />
            <Paso1Contacto
              key={claveContacto}
              datosContacto={datosContacto}
              onActualizarDatos={handleActualizarDatosContacto}
              onSiguiente={() => setPasoActivo(2)}
              onGuardar={handleGuardarBorrador}
              guardando={guardando}
            />
          </>
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
            onGuardar={handleGuardarBorrador}
            guardando={guardando}
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
            tipoEquipoInversor={tipoEquipoInversor}
            setTipoEquipoInversor={setTipoEquipoInversor}
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
            onGuardar={handleGuardarBorrador}
            guardando={guardando}
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
            metodoPago={metodoPago}
            setMetodoPago={setMetodoPago}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
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
            onGuardar={handleGuardarBorrador}
            guardando={guardando}
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
            // El modal de la Carta Poder ya guardó esto en el servidor; se refleja en el
            // estado para que el siguiente "Guardar Proyecto" no lo pise con valores viejos.
            onDatosCartaPoderGuardados={(datos) => {
              setDireccion(datos.direccion);
              setCodigoPostal(datos.codigoPostal);
              setNumeroServicio(datos.numeroServicio);
              setNumeroMedidor(datos.numeroMedidor);
            }}
          />
        )}
      </div>
    </div>
  );
}