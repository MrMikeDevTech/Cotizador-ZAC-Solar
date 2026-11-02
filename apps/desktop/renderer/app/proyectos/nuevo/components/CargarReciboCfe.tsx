'use client';

import { useRef, useState, type DragEvent } from 'react';
import { CircleCheck, FileUp, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { ResultadoReciboCfe } from '@cotizador/shared';
import { ApiError, api } from '../../../../lib/api';
import { Icono } from '../../../components/Icono';
import type { PlanAutocompletado } from '../utils/autocompletarRecibo';

/** Debe coincidir con el límite del backend (`TAMANO_MAXIMO_RECIBO`). */
const TAMANO_MAXIMO_MB = 10;

interface CargarReciboCfeProps {
  /**
   * Recibe lo que leyó el backend, lo aplica al wizard (Pasos 1 y 2) y
   * devuelve el plan aplicado, para mostrar qué se detectó y qué hay que revisar.
   */
  onReciboLeido: (resultado: ResultadoReciboCfe) => PlanAutocompletado;
}

type Estado =
  | { tipo: 'inactivo' }
  | { tipo: 'leyendo'; archivo: string }
  | { tipo: 'listo'; resultado: ResultadoReciboCfe; plan: PlanAutocompletado }
  | { tipo: 'error'; mensaje: string };

function esPdf(archivo: File): boolean {
  return archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
}

/**
 * Autocompletar desde el recibo CFE. Va arriba del Paso 1, **fuera** de
 * `Paso1Contacto`: ese componente se remonta tras cada autocompletado (para que
 * sus campos no controlados muestren los datos nuevos) y arrastraría consigo el
 * mensaje de resultado.
 *
 * Leer un recibo escaneado tarda unos segundos (OCR sin conexión), por eso el
 * estado "leyendo" lo dice claramente en lugar de dejar la pantalla quieta.
 */
export default function CargarReciboCfe({ onReciboLeido }: CargarReciboCfeProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'inactivo' });
  const [arrastrando, setArrastrando] = useState(false);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const leyendo = estado.tipo === 'leyendo';

  const procesar = async (archivo: File) => {
    if (leyendo) return;

    if (!esPdf(archivo)) {
      setEstado({ tipo: 'error', mensaje: 'El archivo debe ser un PDF.' });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setEstado({ tipo: 'error', mensaje: `El PDF supera el máximo de ${TAMANO_MAXIMO_MB} MB.` });
      return;
    }

    setEstado({ tipo: 'leyendo', archivo: archivo.name });
    try {
      const formulario = new FormData();
      formulario.append('archivo', archivo);
      const resultado = await api.subir<ResultadoReciboCfe>(
        '/api/cotizacion/parsear-recibo-cfe',
        formulario
      );

      const plan = onReciboLeido(resultado);
      setEstado({ tipo: 'listo', resultado, plan });
      toast.success('Recibo leído: se cargaron los datos en los Pasos 1 y 2.');
    } catch (error) {
      setEstado({
        tipo: 'error',
        mensaje:
          error instanceof ApiError ? error.message : 'No se pudo leer el recibo. Inténtalo de nuevo.',
      });
    }
  };

  const alElegirArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    // Se limpia para poder volver a elegir el mismo archivo después de corregir algo.
    evento.target.value = '';
    if (archivo) void procesar(archivo);
  };

  const alSoltar = (evento: DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    setArrastrando(false);
    const archivo = evento.dataTransfer.files?.[0];
    if (archivo) void procesar(archivo);
  };

  return (
    <section aria-label="Autocompletar con recibo CFE" className="mb-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!leyendo) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`rounded-2xl border-2 border-dashed p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
          arrastrando ? 'border-[#00388d] bg-blue-50' : 'border-gray-200 bg-gray-50/60'
        }`}
      >
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-700">Autocompletar con el recibo CFE</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Sube el PDF del recibo (o arrástralo aquí) y se llenan el contacto, el número de servicio,
            la tarifa, los hilos y los 6 consumos. Funciona sin conexión; revisa siempre lo detectado.
          </p>
        </div>

        <input
          ref={entradaArchivo}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={alElegirArchivo}
          aria-label="Elegir el PDF del recibo CFE"
        />
        <button
          type="button"
          onClick={() => entradaArchivo.current?.click()}
          disabled={leyendo}
          className="inline-flex items-center justify-center gap-2 border border-[#00388d] text-[#00388d] hover:bg-blue-50 px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icono icon={leyendo ? Loader2 : FileUp} size={15} className={leyendo ? 'animate-spin' : ''} />
          {leyendo ? 'Leyendo…' : 'Cargar Recibo CFE (PDF)'}
        </button>
      </div>

      <div aria-live="polite">
        {estado.tipo === 'leyendo' && (
          <p className="text-[11px] text-gray-500 mt-2">
            Leyendo «{estado.archivo}». Si es un PDF escaneado o impreso desde el celular puede tardar
            unos 10 segundos.
          </p>
        )}

        {estado.tipo === 'error' && (
          <p className="flex items-start gap-2 text-xs text-red-600 mt-2" role="alert">
            <Icono icon={TriangleAlert} size={14} className="mt-0.5" />
            {estado.mensaje}
          </p>
        )}

        {estado.tipo === 'listo' && <ResumenDetectado resultado={estado.resultado} plan={estado.plan} />}
      </div>
    </section>
  );
}

const formatoKwh = new Intl.NumberFormat('es-MX');

function ResumenDetectado({
  resultado,
  plan,
}: {
  resultado: ResultadoReciboCfe;
  plan: PlanAutocompletado;
}) {
  const { datos } = resultado;
  const filas: Array<[string, string]> = [
    ['Titular', datos.nombreCliente],
    ['No. de servicio', datos.numeroServicio],
    ['Tarifa', datos.tarifa],
    ['Hilos', datos.hilos],
    ['Ubicación', [datos.localidad, datos.estado].filter(Boolean).join(', ')],
    ['Periodo', datos.periodo ?? ''],
    [
      'Consumos',
      datos.consumosHistoricos.length > 0
        ? `${datos.consumosHistoricos.map((c) => formatoKwh.format(c.kwh)).join(' · ')} kWh`
        : '',
    ],
  ];

  // Los avisos del parser y los del autocompletado, sin repetir.
  const avisos = [...new Set([...resultado.advertencias, ...plan.avisos])];

  return (
    <div className="mt-3 rounded-2xl border border-green-200 bg-green-50/60 p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-green-800">
        <Icono icon={CircleCheck} size={15} />
        Datos detectados {resultado.origenTexto === 'ocr' ? '(lectura por OCR)' : '(texto del PDF)'}
      </p>
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
        {filas
          .filter(([, valor]) => valor !== '')
          .map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex gap-2">
              <dt className="text-gray-400 shrink-0">{etiqueta}:</dt>
              <dd className="text-gray-700 font-semibold break-words">{valor}</dd>
            </div>
          ))}
      </dl>

      {avisos.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-green-200 pt-2">
          {avisos.map((aviso) => (
            <li key={aviso} className="flex items-start gap-2 text-[11px] text-amber-700">
              <Icono icon={TriangleAlert} size={13} className="mt-0.5" />
              {aviso}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
