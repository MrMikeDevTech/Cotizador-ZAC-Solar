'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Stepper,
  Paso1Contacto,
  Paso2Consumo,
  Paso3Equipo,
  Paso4OtrosCargos,
  Paso5Confirmacion,
} from './components';
import { ConsumoPeriodo, DatosContacto } from './types';
import { panelesData, PAGO_MINIMO_CFE } from './constants';

export default function NuevoProyecto() {
  // --- CONTROL DE PASO ---
  const [pasoActivo, setPasoActivo] = useState(1);

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
  const [ivaCFE, setIvaCFE] = useState(16);
  const [porcentajeDap, setPorcentajeDap] = useState('');
  const [usarNuevaTarifa, setUsarNuevaTarifa] = useState(false);
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState('1A');
  const [aplicarDac, setAplicarDac] = useState(false);
  const [aplicarDap, setAplicarDap] = useState(false);

  const [fechaTexto, setFechaTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [periodo, setPeriodo] = useState('Bimestral');

  const [consumos, setConsumos] = useState<ConsumoPeriodo[]>(
    Array(6).fill({ inicioStr: '', terminoStr: '', kwh: '', pago: '' })
  );

  // --- ESTADOS PASO 3: EQUIPO ---
  const [panelKey, setPanelKey] = useState('');
  const [cantPaneles, setCantPaneles] = useState<number | ''>('');
  const [inversorKey, setInversorKey] = useState('');
  const [cantInversores, setCantInversores] = useState<number | ''>('');

  const [tamanoSistema, setTamanoSistema] = useState(0);
  const [produccion, setProduccion] = useState(0);
  const [autoconsumo, setAutoconsumo] = useState(0);
  const [nuevoPago, setNuevoPago] = useState(0);
  const [ahorro, setAhorro] = useState(0);

  // Promedios calculados a partir de los consumos del Paso 2
  const consumoPromedioKwh = useMemo(() => {
    const sumaKwh = consumos.reduce((acc, curr) => acc + (Number(curr.kwh) || 0), 0);
    return sumaKwh / 6 || 1; // Evitar división por cero
  }, [consumos]);

  const pagoPromedioCFE = useMemo(() => {
    const sumaPago = consumos.reduce((acc, curr) => acc + (Number(curr.pago) || 0), 0);
    return sumaPago / 6;
  }, [consumos]);

  // Cálculos reactivos de producción y ahorro para el Paso 3
  useEffect(() => {
    const cantidad = Number(cantPaneles) || 0;
    const panel = panelesData[panelKey];

    if (!panel) {
      setTamanoSistema(0);
      setProduccion(0);
      setAutoconsumo(0);
      setNuevoPago(0);
      setAhorro(0);
      return;
    }

    const totalWatts = cantidad * panel.watts * panel.factorBifacial;
    setTamanoSistema(totalWatts);

    const produccionBimestral = totalWatts * 0.24725;
    setProduccion(produccionBimestral);

    const porcentaje = cantidad > 0 ? (produccionBimestral / consumoPromedioKwh) * 100 : 0;
    setAutoconsumo(porcentaje);

    if (cantidad > 0) {
      if (porcentaje >= 100) {
        setNuevoPago(PAGO_MINIMO_CFE);
        setAhorro(pagoPromedioCFE - PAGO_MINIMO_CFE);
      } else {
        const proporcionPago =
          (1 - porcentaje / 100) * (pagoPromedioCFE - PAGO_MINIMO_CFE) + PAGO_MINIMO_CFE;
        setNuevoPago(proporcionPago);
        setAhorro(pagoPromedioCFE - proporcionPago);
      }
    } else {
      setNuevoPago(0);
      setAhorro(0);
    }
  }, [panelKey, cantPaneles, consumoPromedioKwh, pagoPromedioCFE]);

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        <h2 className="text-2xl font-bold text-[#00388d] mb-8">Nuevo Proyecto</h2>

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
            onAnterior={() => setPasoActivo(2)}
            onSiguiente={() => setPasoActivo(4)}
          />
        )}

        {/* --- PASO 4: OTROS CARGOS --- */}
        {pasoActivo === 4 && (
          <Paso4OtrosCargos
            onAnterior={() => setPasoActivo(3)}
            onSiguiente={() => setPasoActivo(5)}
          />
        )}

        {/* --- PASO 5: CONFIRMACIÓN --- */}
        {pasoActivo === 5 && (
          <Paso5Confirmacion
            onAnterior={() => setPasoActivo(4)}
            onFinalizar={() => alert('Proyecto creado con éxito')}
          />
        )}
      </div>
    </div>
  );
}