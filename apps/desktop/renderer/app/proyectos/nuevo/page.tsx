'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- IMPORTACIONES CHART.JS ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- DATOS PARA LOS SELECTS PASO 1 ---
const estadosMexico = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

const localidadesPorEstado: Record<string, string[]> = {
  'Nayarit': ['Tepic', 'Xalisco', 'Compostela', 'Bahía de Banderas', 'Acaponeta'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Puerto Vallarta'],
};

const fuentesContacto = [
  'Recomendación', 'Búsqueda Web', 'Formato de solicitud web', 'Llamada', 'Correo electrónico', 'Visita al local', 'Facebook', 'Publicidad', 'Campaña', 'Prospectación', 'Expo', 'Volantes', 'Conocido'
];

const estatusContacto = [
  'Primer contacto', 'Solicitud de recibo', 'Contactar en el futuro', 'No responde', 'No aplica', 'No interesado', 'Contrato con otra empresa', 'Cotización entregada', 'Proyecto aceptado'
];

// --- DATOS PARA PASO 2 ---
const tarifasClasicas = ['1A', '1', '1B', '1C', '1D', '1E', '1F', 'DAC'];
const tarifasNuevas = ['PDBT', 'APBT'];
const opcionesHilos = ['1 hilo', '2 hilos', '3 hilos', 'X'];

const limitesDACTarifas: Record<string, number | null> = {
  "1": 500,
  "1A": 600,
  "1B": 800,
  "1C": 1600,
  "1D": 2000,
  "1E": 4000,
  "1F": 5000,
  "DAC": null,
  "PDBT": null,
  "APBT": null
};

// --- DATOS PARA PASO 3 ---
const panelesData: Record<string, { nombre: string, watts: number, factorBifacial: number }> = {
  "canadian_620_base": { nombre: "Canadian Solar, CS6.2-66TB-620- sin % add.", watts: 620, factorBifacial: 1.0 },
  "canadian_620_bi10": { nombre: "Canadian Solar, CS6.2-66TB-620- Bifacial al 10%.", watts: 620, factorBifacial: 1.10 },
  "canadian_620_bi20": { nombre: "Canadian Solar, CS6.2-66TB-620- Bifacial al 20%.", watts: 620, factorBifacial: 1.20 },
  "jinko_615": { nombre: "Jinko, JKM615N-78HL4-V.", watts: 615, factorBifacial: 1.0 },
  "jinko_620": { nombre: "Jinko, 620W-66HL4M-BDV- sin % add.", watts: 620, factorBifacial: 1.0 },
  "trina_620": { nombre: "TRINA, 620-TSM-NEG19RC.20- sin %add.", watts: 620, factorBifacial: 1.0 }
};

const inversoresData: Record<string, { nombre: string, wattsMax: number }> = {
  "growatt_10k_2020": { nombre: "Growatt, MIN 10000 TL-X/2020", wattsMax: 14000 },
  "growatt_2500": { nombre: "Growatt, MIN 2500TL - X2", wattsMax: 3500 },
  "growatt_3000": { nombre: "Growatt, MIN 3000TL - X2", wattsMax: 4200 },
  "growatt_3600": { nombre: "Growatt, MIN 3600TL - X2", wattsMax: 4900 }, 
  "growatt_4200": { nombre: "Growatt, MIN 4200TL - X2", wattsMax: 5800 },
  "growatt_4600": { nombre: "Growatt, MIN 4600TL - X2", wattsMax: 6400 },
  "growatt_5000": { nombre: "Growatt, MIN 5000TL - X2", wattsMax: 7000 },
  "growatt_6000": { nombre: "Growatt, MIN 6000TL - X2", wattsMax: 8400 },
  "growatt_7000": { nombre: "Growatt, MIN 7000TL - X2", wattsMax: 9800 },
  "growatt_8000": { nombre: "Growatt, MIN 8000TL - X2", wattsMax: 11200 },
  "growatt_9000": { nombre: "Growatt, MIN 9000TL - X2", wattsMax: 12600 },
  "growatt_10k_x2": { nombre: "Growatt, MIN 10000TL - X2", wattsMax: 14000 },
  "growatt_mic_3300": { nombre: "Growatt, MIC 3300TL - X2", wattsMax: 4600 },
  "growatt_neo_2500m": { nombre: "Growatt, NEO 2500M - X2", wattsMax: 3500 }
};

export default function NuevoProyecto() {
  // --- ESTADOS PASO 1 ---
  const [pasoActivo, setPasoActivo] = useState(1);
  const [mostrarEmpresariales, setMostrarEmpresariales] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const localidadesSugeridas = localidadesPorEstado[estadoSeleccionado] || [];

  // --- ESTADOS PASO 2 ---
  const [usarNuevaTarifa, setUsarNuevaTarifa] = useState(false);
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState('1A'); 
  const [aplicarDac, setAplicarDac] = useState(false);
  const [aplicarDap, setAplicarDap] = useState(false);
  
  const [fechaTexto, setFechaTexto] = useState(''); 
  const [fechaInicio, setFechaInicio] = useState(''); 
  const [periodo, setPeriodo] = useState('Bimestral');

  const [consumos, setConsumos] = useState(
    Array(6).fill({ inicioStr: '', terminoStr: '', kwh: '', pago: '' })
  );

  // --- ESTADOS PASO 3 ---
  const [panelKey, setPanelKey] = useState("");
  const [cantPaneles, setCantPaneles] = useState<number | ''>(''); 
  const [inversorKey, setInversorKey] = useState("");
  const [cantInversores, setCantInversores] = useState<number | ''>(''); 

  const [tamanoSistema, setTamanoSistema] = useState(0);
  const [produccion, setProduccion] = useState(0);
  const [autoconsumo, setAutoconsumo] = useState(0);
  const [nuevoPago, setNuevoPago] = useState(0);
  const [ahorro, setAhorro] = useState(0);

  // Variables vinculadas al Paso 2 para el Paso 3
  const consumoPromedioKwh = consumos.reduce((acc, curr) => acc + (Number(curr.kwh) || 0), 0) / 6 || 1; // Evitar división por cero
  const pagoPromedioCFE = consumos.reduce((acc, curr) => acc + (Number(curr.pago) || 0), 0) / 6;
  const pagoMinimoCFE = 60; // Valor aproximado del cargo mínimo de CFE

  

  // --- EFECTOS PASO 2 ---
  useEffect(() => {
    setTarifaSeleccionada(usarNuevaTarifa ? 'PDBT' : '1A');
  }, [usarNuevaTarifa]);

  const handleFechaTextoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
    
    setFechaTexto(val); 

    if (val.length === 10) {
      const [day, month, year] = val.split('/');
      setFechaInicio(`${year}-${month}-${day}`);
    } else {
      setFechaInicio(''); 
    }
  };

  useEffect(() => {
    if (!fechaInicio || fechaInicio.length < 10) return;
    
    const [year, month, day] = fechaInicio.split('-');
    const startYear = parseInt(year);
    const startMonth = parseInt(month) - 1; 
    
    const step = periodo === 'Bimestral' ? 2 : 1;

    setConsumos((prev) => {
      const nuevos = [...prev];
      for (let i = 0; i < 6; i++) {
        const dateStart = new Date(startYear, startMonth - (i * step), 15);
        const dateEnd = new Date(startYear, startMonth - (i * step) + step, 15);

        const sMonth = dateStart.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
        const sYear = dateStart.getFullYear();
        
        const eMonth = dateEnd.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
        const eYear = dateEnd.getFullYear();

        nuevos[i] = {
          ...nuevos[i],
          inicioStr: `${sMonth} ${sYear}`,
          terminoStr: `${eMonth} ${eYear}`,
        };
      }
      return nuevos;
    });
  }, [fechaInicio, periodo]);

  const handleConsumoChange = (index: number, campo: 'kwh' | 'pago', valor: string) => {
    setConsumos((prev) => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], [campo]: valor };
      return nuevos;
    });
  };

  // --- EFECTOS PASO 3 ---
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

    let porcentaje = cantidad > 0 ? (produccionBimestral / consumoPromedioKwh) * 100 : 0;
    setAutoconsumo(porcentaje);

    if (cantidad > 0) {
      if (porcentaje >= 100) {
        setNuevoPago(pagoMinimoCFE);
        setAhorro(pagoPromedioCFE - pagoMinimoCFE);
      } else {
        const proporcionPago = (1 - (porcentaje / 100)) * (pagoPromedioCFE - pagoMinimoCFE) + pagoMinimoCFE;
        setNuevoPago(proporcionPago);
        setAhorro(pagoPromedioCFE - proporcionPago);
      }
    } else {
      setNuevoPago(0);
      setAhorro(0);
    }
  }, [panelKey, cantPaneles, consumoPromedioKwh, pagoPromedioCFE]);

  // --- CONFIGURACIÓN CHART.JS PASO 2 ---
  const consumosVolteados = [...consumos].reverse(); 
  const limiteActual = limitesDACTarifas[tarifaSeleccionada];

  const datasetsGraficaPaso2: any[] = [
    {
      label: 'Consumo',
      data: consumosVolteados.map(item => Number(item.kwh) || 0),
      borderColor: '#00388d', 
      backgroundColor: '#fff',
      pointBorderColor: '#00388d',
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0, 
    }
  ];

  if (limiteActual !== null && limiteActual !== undefined) {
    datasetsGraficaPaso2.push({
      label: 'Límite DAC',
      data: consumosVolteados.map(() => limiteActual), 
      borderColor: '#ef4444', 
      backgroundColor: '#fff',
      pointBorderColor: '#ef4444',
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0,
    });
  }

  const chartDataPaso2 = {
    labels: consumosVolteados.map(item => item.inicioStr || '---'),
    datasets: datasetsGraficaPaso2
  };

  const chartOptionsPaso2 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, align: 'end' as const, labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } },
      tooltip: { backgroundColor: 'rgba(255,255,255,0.9)', titleColor: '#1f2937', bodyColor: '#1f2937', borderColor: '#e5e7eb', borderWidth: 1 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6b7280' } },
      y: { title: { display: true, text: 'kWh', color: '#00388d', font: { weight: 'bold' as const } }, grid: { color: '#e5e7eb' }, border: { display: false }, ticks: { font: { size: 10 }, color: '#6b7280' } }
    }
  };

  // --- CONFIGURACIÓN CHART.JS PASO 3 ---
  const pagosHistoricos = consumosVolteados.map(item => Number(item.pago) || 0);
  const pagosNuevos = consumosVolteados.map(item => {
    const pagoOriginal = Number(item.pago) || 0;
    // Cálculo simplificado de proyección para la gráfica
    return autoconsumo >= 100 ? pagoMinimoCFE : Math.max(pagoOriginal - ahorro, pagoMinimoCFE);
  });

  const chartDataPaso3 = {
    labels: consumosVolteados.map(item => item.inicioStr || '---'),
    datasets: [
      {
        label: 'Pago histórico',
        data: pagosHistoricos, 
        borderColor: '#1f2937',
        backgroundColor: '#fff',
        pointBorderColor: '#1f2937',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        tension: 0,
      },
      {
        label: 'Nuevos pagos',
        data: pagosNuevos, 
        borderColor: '#3b82f6',
        backgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        tension: 0,
      }
    ]
  };

  const chartOptionsPaso3 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, align: 'end' as const, labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } },
      tooltip: { backgroundColor: 'rgba(255,255,255,0.9)', titleColor: '#1f2937', bodyColor: '#1f2937', borderColor: '#e5e7eb', borderWidth: 1 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6b7280' } },
      y: { 
        title: { display: true, text: 'Monto', color: '#00388d', font: { weight: 'bold' as const } }, 
        grid: { color: '#e5e7eb' }, 
        border: { display: false }, 
        min: 0,
        ticks: { 
          font: { size: 10 }, 
          color: '#6b7280',
          callback: (value: any) => '$' + value 
        } 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max">
        
        <h2 className="text-2xl font-bold text-[#00388d] mb-8">Nuevo Proyecto</h2>

        {/* --- INDICADOR DE PASOS (Stepper) --- */}
        <div className="flex flex-wrap justify-between items-center border-b border-gray-100 pb-4 mb-8 text-sm gap-4">
          {[
            { num: 1, label: 'Contacto' },
            { num: 2, label: 'Consumo' },
            { num: 3, label: 'Equipo' },
            { num: 4, label: 'Otros cargos' },
            { num: 5, label: 'Confirmación' }
          ].map((paso) => (
            <div key={paso.num} className={`flex items-center gap-2 ${pasoActivo === paso.num ? 'border-b-2 border-[#00388d] pb-2' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${pasoActivo === paso.num ? 'bg-[#00388d] text-white shadow-md' : (pasoActivo > paso.num ? 'bg-[#8cc63f] text-white' : 'bg-gray-100 text-gray-400')}`}>
                {paso.num}
              </div>
              <span className={`font-medium ${pasoActivo === paso.num ? 'text-[#00388d] font-bold' : 'text-gray-400'}`}>
                Paso<br/>{paso.label}
              </span>
            </div>
          ))}
        </div>

        {/* --- PASO 1: CONTACTO --- */}
        {pasoActivo === 1 && (
          <form className="space-y-8 animate-fade-in">
            {/* ... (Todo tu código del Paso 1 permanece idéntico) ... */}
            <div className="w-full md:w-1/3">
              <label className="block text-xs text-gray-400 mb-1">Contacto</label>
              <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
                <option value="">Seleccionar contacto existente</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre*</label>
                <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Apellido paterno</label>
                <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Apellido materno</label>
                <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono* (Incluir lada)</label>
                <input type="tel" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Celular</label>
                <input type="tel" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
                <input type="email" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Estado*</label>
                <select 
                  value={estadoSeleccionado}
                  onChange={(e) => setEstadoSeleccionado(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
                >
                  <option value="">----------</option>
                  {estadosMexico.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Localidad*</label>
                <input 
                  type="text" 
                  list="lista-localidades"
                  placeholder="Selecciona o escribe..."
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d]" 
                />
                <datalist id="lista-localidades">
                  {localidadesSugeridas.map(loc => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Fuente del contacto*</label>
                <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
                  <option value="">----------</option>
                  {fuentesContacto.map(fuente => (
                    <option key={fuente} value={fuente}>{fuente}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Estatus*</label>
                <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
                  <option value="">----------</option>
                  {estatusContacto.map(estatus => (
                    <option key={estatus} value={estatus}>{estatus}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea rows={1} className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"></textarea>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer w-max">
                <input 
                  type="checkbox" 
                  checked={mostrarEmpresariales}
                  onChange={() => setMostrarEmpresariales(!mostrarEmpresariales)}
                  className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]"
                />
                <span className="text-sm font-medium text-gray-600">Registrar datos empresariales</span>
              </label>

              {mostrarEmpresariales && (
                <div className="mt-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-600 mb-4">Datos empresariales:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">RFC</label>
                      <input type="text" className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cargo del contacto</label>
                      <input type="text" className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Razón social</label>
                      <input type="text" className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Actividad comercial</label>
                      <input type="text" className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-[#00388d]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
              <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                Cancelar
              </Link>
              <button 
                type="button" 
                onClick={() => setPasoActivo(2)}
                className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors"
              >
                Guardar y continuar
              </button>
            </div>
          </form>
        )}

        {/* --- PASO 2: CONSUMO --- */}
        {pasoActivo === 2 && (
          <form className="space-y-10 animate-fade-in pt-4">
            {/* ... (Todo tu código del Paso 2 permanece idéntico) ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Nombre del proyecto</label>
                <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={usarNuevaTarifa} onChange={(e) => setUsarNuevaTarifa(e.target.checked)} className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]" />
                  <span className="text-xs text-gray-500">Usar nueva tarifa</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Localidad</label>
                <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
                  <option>Nayarit - Compostela</option>
                  <option>Jalisco - Guadalajara</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-12">
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-400 mb-1">Tarifa CFE</label>
                <select 
                  value={tarifaSeleccionada}
                  onChange={(e) => setTarifaSeleccionada(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
                >
                  {(usarNuevaTarifa ? tarifasNuevas : tarifasClasicas).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-400 mb-1">Número de hilos</label>
                <select className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer">
                  {opcionesHilos.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={aplicarDac} onChange={(e) => setAplicarDac(e.target.checked)} className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]" />
                  <span className="text-xs text-gray-500">Aplicar DAC</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Nombre que aparece en el recibo</label>
                  <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Número de servicio</label>
                  <input type="text" className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" />
                </div>
              </div>
              <div className="flex pb-2">
                <button type="button" className="bg-[#00388d] hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all text-sm">
                  Obtener Consumos de CFE
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-12">
              <div className="w-40 relative">
                <label className="block text-xs font-bold text-gray-400 mb-1">IVA de CFE</label>
                <div className="flex border border-gray-200 rounded-md overflow-hidden">
                  <input type="number" defaultValue="16" className="w-full py-2 px-3 text-sm focus:outline-none" />
                  <div className="bg-[#00388d] text-white flex items-center justify-center px-3 font-bold">%</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={aplicarDap} onChange={(e) => setAplicarDap(e.target.checked)} className="w-4 h-4 text-[#00388d] border-gray-300 rounded focus:ring-[#00388d]" />
                  <span className="text-xs text-gray-500">Aplicar<br/>DAP</span>
                </label>
                
                {aplicarDap && (
                  <div className="w-24">
                    <label className="block text-xs font-bold text-gray-400 mb-1 text-center">% DAP</label>
                    <input type="number" className="w-full border-b border-gray-300 py-1 text-center text-sm focus:outline-none focus:border-[#00388d]" />
                  </div>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-wrap gap-12">
              <div className="w-64">
                <label className="block text-xs font-bold text-gray-500 mb-1">Inicio del último periodo (DD/MM/AAAA)</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  placeholder="Ej: 07/04/2026"
                  maxLength={10}
                  value={fechaTexto}
                  onChange={handleFechaTextoChange}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" 
                />
              </div>
              <div className="w-64">
                <label className="block text-xs font-bold text-gray-500 mb-1">Periodo</label>
                <select 
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
                >
                  <option value="Bimestral">Bimestral</option>
                  <option value="Mensual">Mensual</option>
                </select>
              </div>
            </div>

            <div className="w-full overflow-x-auto mt-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-4 w-[25%]">Inicio</th>
                    <th className="py-4 w-[25%]">Término</th>
                    <th className="py-4 w-[25%] text-center">kWh</th>
                    <th className="py-4 w-[25%] text-right">Pago a CFE</th>
                  </tr>
                </thead>
                <tbody>
                  {consumos.map((row, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="py-4 text-gray-600 capitalize">{row.inicioStr || '---'}</td>
                      <td className="py-4 text-gray-600 capitalize">{row.terminoStr || '---'}</td>
                      <td className="py-3">
                        <div className="flex justify-center">
                          <input 
                            type="number" 
                            value={row.kwh}
                            onChange={(e) => handleConsumoChange(index, 'kwh', e.target.value)}
                            className="w-32 border border-gray-200 rounded px-3 py-2 text-center focus:outline-none focus:border-[#00388d]" 
                          />
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end items-center gap-1">
                          <span className="text-gray-400">$</span>
                          <input 
                            type="number" 
                            value={row.pago}
                            onChange={(e) => handleConsumoChange(index, 'pago', e.target.value)}
                            className="w-32 border border-gray-200 rounded px-3 py-2 text-right focus:outline-none focus:border-[#00388d]" 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="border-gray-100 my-8" />

            <div className="w-full">
              <h3 className="text-center font-bold text-gray-600 mb-1">Consumo histórico</h3>
              <p className="text-center text-xs text-gray-400 mb-8 capitalize">
                {consumos[5].inicioStr ? `${consumos[5].inicioStr} - ${consumos[0].terminoStr}` : 'Ingrese fecha para ver periodo'}
              </p>

              <div className="w-full h-80">
                <Line data={chartDataPaso2} options={chartOptionsPaso2} />
              </div>
            </div>

            <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
              <button type="button" onClick={() => setPasoActivo(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                Regresar a Contacto
              </button>
              <button 
                type="button" 
                onClick={() => setPasoActivo(3)}
                className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors"
              >
                Guardar y continuar a Equipo
              </button>
            </div>
          </form>
        )}

        {/* --- PASO 3: EQUIPO --- */}
        {pasoActivo === 3 && (
          <form className="space-y-10 animate-fade-in pt-4">
            
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
                ></div>
                <div 
                  className="absolute -top-8 bg-[#2dd4bf] text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center justify-center transition-all duration-500 ease-out z-10"
                  style={{ 
                    left: `${Math.min(autoconsumo, 100)}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {Math.min(autoconsumo, 100).toFixed(0)}%
                  <div className="absolute -bottom-1 w-2 h-2 bg-[#2dd4bf] rotate-45"></div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100 mb-8" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-400 mb-1">Modelo del panel</label>
                <select 
                  value={panelKey}
                  onChange={(e) => setPanelKey(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
                >
                  <option value="" disabled hidden>Selecciona un panel...</option>
                  {Object.entries(panelesData).map(([key, data]) => (
                    <option key={key} value={key}>{data.nombre}</option>
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
                <label className="block text-xs font-bold text-gray-400 mb-1">Producción del sistema</label>
                <div className="w-full border-b border-gray-300 py-2 text-sm text-gray-800 h-9 flex items-center">
                  {produccion > 0 ? `${produccion.toFixed(2)} kWh/periodo` : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end mb-8">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-400 mb-1">Tipo de inversor</label>
                <select 
                  value={inversorKey}
                  onChange={(e) => setInversorKey(e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#00388d] cursor-pointer"
                >
                  <option value="" disabled hidden>Selecciona un inversor...</option>
                  {Object.entries(inversoresData).map(([key, data]) => (
                    <option key={key} value={key}>{data.nombre}</option>
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
                  onChange={(e) => setCantInversores(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]" 
                />
              </div>

              <div>
                <button type="button" className="border border-[#00388d] text-[#00388d] hover:bg-blue-50 px-6 py-2 rounded-full text-sm font-semibold transition-colors">
                  Actualizar
                </button>
              </div>
              
              <div className="text-right">
                <button type="button" className="text-[#00388d] border border-transparent hover:border-[#00388d] px-4 py-2 rounded-full text-sm font-semibold transition-colors">
                  Configuraciones avanzadas
                </button>
              </div>
            </div>

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

            <div className="w-full">
              <h3 className="text-center font-bold text-gray-600 mb-1">Proyección de pagos</h3>
              <p className="text-center text-xs text-gray-400 mb-8 capitalize">
                {consumos[5].inicioStr ? `${consumos[5].inicioStr} - ${consumos[0].terminoStr}` : 'Periodo de pagos'}
              </p>

              <div className="w-full h-80">
                <Line data={chartDataPaso3} options={chartOptionsPaso3} />
              </div>
            </div>

            <div className="flex justify-end items-center gap-6 pt-8 border-t border-gray-100 mt-8">
              <button type="button" onClick={() => setPasoActivo(2)} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                Regresar a Consumo
              </button>
              <button 
                type="button" 
                onClick={() => setPasoActivo(4)}
                className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors"
              >
                Guardar y continuar a Otros cargos
              </button>
            </div>
          </form>
        )}

        {/* --- AQUÍ PEGA EL PASO 4 --- */}
        {pasoActivo === 4 && (
          <div className="py-12 text-center animate-fade-in">
            <h3 className="text-2xl font-bold text-[#00388d] mb-4">Paso 4: Otros cargos</h3>
            <p className="text-gray-600">Este paso lo construiremos en el siguiente bloque.</p>
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setPasoActivo(3)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 underline transition-colors"
              >
                Regresar al Paso 3
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}