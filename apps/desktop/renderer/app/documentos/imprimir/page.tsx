'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  ResumenEmpresa,
  ResumenContactoConsumo,
  ResumenEquipo,
  ResumenAhorro,
  TablaConsumoHistorico,
  ResumenCotizacion,
} from '../../proyectos/nuevo/components/confirmacion';
import { api } from '../../../lib/api';
import { useConfiguracion } from '../../../lib/ConfiguracionContext';

/**
 * Vista de impresión offline: sin navbar, sin botones de acción. Electron la
 * carga en una ventana oculta y usa webContents.printToPDF() sobre ella
 * (ver electron/main.ts, canal IPC "generar-pdf"). Un solo route sirve los
 * tres tipos de documento vía query string, porque el export estático de
 * Next no admite rutas dinámicas sin generateStaticParams.
 */
export default function ImprimirDocumento() {
  const { empresa } = useConfiguracion();
  const [proyecto, setProyecto] = useState<any>(null);
  const [tipo, setTipo] = useState<string>('cotizacion');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proyectoId = params.get('proyectoId');
    setTipo(params.get('tipo') ?? 'cotizacion');
    if (!proyectoId) {
      setCargando(false);
      return;
    }
    api
      .get<any>(`/api/proyectos/${proyectoId}`)
      .then(setProyecto)
      .finally(() => setCargando(false));
  }, []);

  // Señal para electron/main.ts: sabe que ya puede llamar a printToPDF()
  // cuando el título del documento cambia a "LISTO" (ver canal IPC "generar-pdf").
  useEffect(() => {
    if (!cargando) document.title = proyecto ? 'LISTO' : 'ERROR';
  }, [cargando, proyecto]);

  if (cargando) return <div className="p-10 text-sm text-gray-500">Cargando…</div>;
  if (!proyecto) return <div className="p-10 text-sm text-red-500">Proyecto no encontrado.</div>;

  const cotizacion = proyecto.cotizaciones?.[0];
  const nombreContacto = [proyecto.contacto?.nombre, proyecto.contacto?.apellidoPaterno, proyecto.contacto?.apellidoMaterno]
    .filter(Boolean)
    .join(' ');

  if (tipo === 'contrato' || tipo === 'carta-poder') {
    return (
      <div className="max-w-3xl mx-auto p-10 text-sm text-gray-800 space-y-6">
        <h1 className="text-xl font-bold text-[#00388d]">
          {tipo === 'contrato' ? 'Contrato de instalación de sistema fotovoltaico' : 'Carta poder'}
        </h1>
        <p>Proyecto: <strong>{proyecto.nombre}</strong> ({proyecto.codigo})</p>
        <p>Cliente: <strong>{nombreContacto}</strong></p>
        <p>Localidad: {proyecto.contacto?.localidad}, {proyecto.contacto?.estado}</p>
        {cotizacion && (
          <p>
            Equipo: {cotizacion.cantPaneles} × {cotizacion.panelNombre}, {cotizacion.cantInversores} × {cotizacion.inversorNombre}.
            <br />
            Monto total: ${cotizacion.granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {cotizacion.tipoMoneda}.
          </p>
        )}
        <p className="text-xs text-gray-400 pt-8 border-t border-gray-100">
          Documento generado automáticamente el {new Date().toLocaleDateString('es-MX')}. Plantilla básica —
          reemplázala en Configuración cuando se carguen las plantillas legales definitivas.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-6 text-gray-700">
      <ResumenEmpresa empresa={empresa} />
      <ResumenContactoConsumo
        datosContacto={{
          nombre: proyecto.contacto?.nombre,
          apellidoPaterno: proyecto.contacto?.apellidoPaterno,
          apellidoMaterno: proyecto.contacto?.apellidoMaterno,
          localidad: proyecto.contacto?.localidad,
          estado: proyecto.contacto?.estado,
          telefono: proyecto.contacto?.telefono,
          celular: proyecto.contacto?.celular,
          email: proyecto.contacto?.email,
          fuenteContacto: proyecto.contacto?.fuenteContacto,
        } as any}
        nombreProyecto={proyecto.nombre}
        nombreRecibo={proyecto.nombreRecibo}
        tarifaSeleccionada={proyecto.tarifa}
        numeroServicio={proyecto.numeroServicio}
        periodo={proyecto.periodo}
      />
      {cotizacion && (
        <>
          <ResumenEquipo
            panelKey={cotizacion.panelClave}
            cantPaneles={cotizacion.cantPaneles}
            inversorKey={cotizacion.inversorClave}
            cantInversores={cotizacion.cantInversores}
            tamanoSistema={cotizacion.tamanoSistemaW}
            produccion={cotizacion.produccionPeriodo}
            autoconsumo={cotizacion.autoconsumoPct}
            periodo={proyecto.periodo}
          />
          <ResumenAhorro
            pagoPromedioCFE={proyecto.consumos.reduce((a: number, c: any) => a + c.pago, 0) / 6}
            nuevoPago={cotizacion.nuevoPago}
            ahorro={cotizacion.ahorroPeriodo}
            periodo={proyecto.periodo}
          />
        </>
      )}
      <TablaConsumoHistorico
        consumos={proyecto.consumos.map((c: any) => ({ inicioStr: c.inicioStr, terminoStr: c.terminoStr, kwh: String(c.kwh), pago: String(c.pago) }))}
      />
      {cotizacion && (
        <ResumenCotizacion
          conceptos={cotizacion.conceptos.map((c: any) => ({ id: c.id, concepto: c.concepto, costoBase: c.costoBase, margenPorcentaje: c.margenPorcentaje }))}
          estructuraActual={cotizacion.estructuraId ? { id: cotizacion.estructuraId, nombre: cotizacion.estructuraNombre, precio: cotizacion.estructuraPrecio } : undefined}
          cargosEditables={cotizacion.cargos.map((c: any) => ({ id: c.id, nombre: c.nombre, monto: c.monto }))}
          subtotalConDescuento={cotizacion.subtotalConDescuento}
          granTotal={cotizacion.granTotal}
          incluirIva={cotizacion.incluirIva}
          tipoMoneda={cotizacion.tipoMoneda}
        />
      )}
    </div>
  );
}
