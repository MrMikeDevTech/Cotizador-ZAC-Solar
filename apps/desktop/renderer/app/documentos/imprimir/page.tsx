'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useConfiguracion } from '../../../lib/ConfiguracionContext';
import { DocumentoCotizacion } from './DocumentoCotizacion';
import type { ProyectoImpreso, TipoDocumento } from './tipos';

/**
 * Vista de impresión offline: sin navbar y sin botones. Electron la carga en
 * una ventana oculta y le aplica `webContents.printToPDF()` (ver
 * electron/main.ts, canal IPC "generar-pdf"). Un solo route sirve los tres
 * tipos de documento vía query string, porque el export estático de Next no
 * admite rutas dinámicas sin `generateStaticParams`.
 *
 * Este archivo es **solo fontanería**: lee la query string, pide el proyecto y
 * da la señal de "listo". El diseño de cada documento vive aparte — la
 * cotización en `DocumentoCotizacion.tsx` — para poder rediseñarla sin tocar
 * nada de esto.
 */
export default function ImprimirDocumento() {
  const { empresa } = useConfiguracion();
  const [proyecto, setProyecto] = useState<ProyectoImpreso | null>(null);
  const [tipo, setTipo] = useState<TipoDocumento>('cotizacion');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proyectoId = params.get('proyectoId');
    setTipo((params.get('tipo') as TipoDocumento) ?? 'cotizacion');

    if (!proyectoId) {
      setCargando(false);
      return;
    }

    api
      .get<ProyectoImpreso>(`/api/proyectos/${proyectoId}`)
      .then(setProyecto)
      .catch(() => setProyecto(null))
      .finally(() => setCargando(false));
  }, []);

  // Señal para electron/main.ts: espera a que el título sea "LISTO" antes de
  // llamar a printToPDF(), para no capturar la página a medio renderizar.
  // "ERROR" aborta la generación con un mensaje en vez de producir un PDF en
  // blanco (ver `esperarListoParaImprimir`).
  useEffect(() => {
    if (!cargando) document.title = proyecto ? 'LISTO' : 'ERROR';
  }, [cargando, proyecto]);

  if (cargando) return <div className="p-10 text-sm text-gray-500">Cargando…</div>;
  if (!proyecto) return <div className="p-10 text-sm text-red-500">Proyecto no encontrado.</div>;

  if (tipo === 'contrato' || tipo === 'carta-poder') {
    return <DocumentoLegal proyecto={proyecto} tipo={tipo} />;
  }

  return <DocumentoCotizacion proyecto={proyecto} empresa={empresa} />;
}

/**
 * Contrato y carta poder: plantilla mínima a la espera de los textos legales
 * definitivos. Se mantiene aquí, y no en un archivo propio, justamente porque
 * no es trabajo de diseño sino un marcador de posición — cuando lleguen los
 * textos reales conviene sacarla a su propio componente, como la cotización.
 */
function DocumentoLegal({
  proyecto,
  tipo,
}: {
  proyecto: ProyectoImpreso;
  tipo: 'contrato' | 'carta-poder';
}) {
  const cotizacion = proyecto.cotizaciones?.[0];
  const nombreContacto = [
    proyecto.contacto?.nombre,
    proyecto.contacto?.apellidoPaterno,
    proyecto.contacto?.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-3xl mx-auto p-10 text-sm text-gray-800 space-y-6">
      <h1 className="text-xl font-bold text-[#00388d]">
        {tipo === 'contrato' ? 'Contrato de instalación de sistema fotovoltaico' : 'Carta poder'}
      </h1>
      <p>
        Proyecto: <strong>{proyecto.nombre}</strong> ({proyecto.codigo})
      </p>
      <p>
        Cliente: <strong>{nombreContacto}</strong>
      </p>
      <p>
        Localidad: {proyecto.contacto?.localidad}, {proyecto.contacto?.estado}
      </p>
      {cotizacion && (
        <p>
          Equipo: {cotizacion.cantPaneles} × {cotizacion.panelNombre}, {cotizacion.cantInversores} ×{' '}
          {cotizacion.inversorNombre}.
          <br />
          Monto total: $
          {cotizacion.granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}{' '}
          {cotizacion.tipoMoneda}.
        </p>
      )}
      <p className="text-xs text-gray-400 pt-8 border-t border-gray-100">
        Documento generado automáticamente el {new Date().toLocaleDateString('es-MX')}. Plantilla
        básica — reemplázala cuando se carguen los textos legales definitivos.
      </p>
    </div>
  );
}
