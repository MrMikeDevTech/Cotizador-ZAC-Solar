'use client';

import { useEffect, useState } from 'react';
import {
  construirCotizacionPdf,
  type ContactoCotizable,
  type EmpresaPdf,
  type ProyectoCotizable,
} from '@cotizador/shared';
import { api } from '../../../lib/api';
import { useConfiguracion } from '../../../lib/ConfiguracionContext';
import { useSesion } from '../../../lib/SesionContext';
import type { DatosEmpresa } from '../../proyectos/nuevo/types';
import { DocumentoCotizacion } from './DocumentoCotizacion';
import type { ContactoImpreso, ProyectoImpreso, TipoDocumento } from './tipos';

/**
 * Vista de impresión offline: sin navbar y sin botones. Electron la carga en
 * una ventana oculta y le aplica `webContents.printToPDF()` (ver
 * electron/main.ts, canal IPC "generar-pdf"). Un solo route sirve los tres
 * tipos de documento vía query string, porque el export estático de Next no
 * admite rutas dinámicas sin `generateStaticParams`.
 *
 * Este archivo es **solo fontanería**: lee la query string, pide el proyecto,
 * traduce esos datos al contrato que consume cada documento, y da la señal
 * de "listo". El diseño de cada documento vive aparte — la cotización en
 * `DocumentoCotizacion.tsx` — para poder rediseñarla sin tocar nada de esto.
 */
export default function ImprimirDocumento() {
  // `cargando` de la configuración importa tanto como el del proyecto: si
  // el documento se pinta antes de que llegue `empresa`, se pinta sin logo
  // ni firma (porque `empresa` todavía es `null`) y la señal de "listo" no
  // debe adelantarse a eso, o el PDF saldría sin logo de forma intermitente
  // según qué fetch gane la carrera.
  const { empresa, cargando: cargandoConfig } = useConfiguracion();
  const { usuario } = useSesion();
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

  // No hay cotización vigente que imprimir: el proyecto cargó, pero
  // `cotizaciones[0]` no existe (p. ej. un borrador que no llegó al Paso 4).
  const sinCotizacionVigente =
    tipo === 'cotizacion' && proyecto !== null && proyecto.cotizaciones.length === 0;

  // Señal para electron/main.ts: espera a `document.body.dataset.listo ===
  // '1'` antes de llamar a printToPDF(), para no capturar la página a medio
  // renderizar. `dataset.listo === 'error'` aborta la generación con un
  // mensaje en vez de producir un PDF en blanco (ver `esperarListoParaImprimir`).
  //
  // No se usa `document.title` para esto: esta misma vista se puede abrir
  // directo en el navegador para revisar el documento, y el título de la
  // pestaña sí debe ser legible ("Cotización — <proyecto>"), no una palabra
  // en mayúsculas que además termina en los metadatos del PDF.
  //
  // "listo" no basta con que los datos hayan llegado: la cotización depende
  // de un logo (`/zac-logo.png`) y de fuentes autoalojadas (Playfair
  // Display en sus dos pesos, Inter, Oswald) que tardan un instante en
  // decodificarse. Sin esperarlas hay una ventana real, intermitente, en la
  // que `printToPDF` se dispara con el logo a medio cargar o con la fuente
  // de respaldo del sistema en vez de la corporativa. Por eso la señal
  // también espera a que las imágenes del documento ya renderizado estén
  // cargadas y a `document.fonts.ready`. Electron da 8 segundos de margen
  // (de sobra para recursos locales) antes de abortar con un error claro — y
  // es justo eso lo que se quiere si algo de esto no resolviera: mejor un
  // timeout explícito que un PDF incompleto, así que aquí no hay try/catch
  // que fuerce "listo" a toda costa.
  useEffect(() => {
    if (cargando || cargandoConfig) return;

    if (!proyecto || sinCotizacionVigente) {
      document.title = 'Cotización — error';
      document.body.dataset.listo = 'error';
      return;
    }

    document.title = `Cotización — ${proyecto.nombre}`;

    let cancelado = false;

    async function marcarListoCuandoEsteTodoCargado() {
      const imagenes = Array.from(document.images);
      const cargasDeImagen = imagenes.map(
        (imagen) =>
          new Promise<void>((resolver) => {
            if (imagen.complete) {
              resolver();
              return;
            }
            imagen.addEventListener('load', () => resolver(), { once: true });
            imagen.addEventListener('error', () => resolver(), { once: true });
          })
      );

      await Promise.all([...cargasDeImagen, document.fonts.ready]);
      if (!cancelado) document.body.dataset.listo = '1';
    }

    // Se difiere un frame para asegurar que React ya pintó el documento (y
    // por tanto el `src` final de sus imágenes) antes de inspeccionarlas.
    const idFrame = requestAnimationFrame(() => {
      marcarListoCuandoEsteTodoCargado();
    });

    return () => {
      cancelado = true;
      cancelAnimationFrame(idFrame);
    };
  }, [cargando, cargandoConfig, proyecto, sinCotizacionVigente]);

  if (cargando) return <div className="p-10 text-sm text-gray-500">Cargando…</div>;
  if (!proyecto) return <div className="p-10 text-sm text-red-500">Proyecto no encontrado.</div>;

  if (tipo === 'contrato' || tipo === 'carta-poder') {
    return <DocumentoLegal proyecto={proyecto} tipo={tipo} />;
  }

  if (sinCotizacionVigente) {
    return (
      <div className="p-10 text-sm text-red-500">
        El proyecto no tiene una cotización vigente que imprimir.
      </div>
    );
  }

  const datos = construirCotizacionPdf({
    proyecto: adaptarProyectoCotizable(proyecto),
    empresa: adaptarEmpresaPdf(empresa),
    fecha: new Date(),
    // Si Configuración no tiene un firmante fijo, firma quien está cotizando.
    // Esta vista corre en el mismo origen que la app (también en la ventana
    // oculta de Electron), así que la sesión está disponible aquí.
    firmantePorDefecto: usuario ? { nombre: usuario.nombre } : undefined,
  });

  return <DocumentoCotizacion datos={datos} />;
}

/**
 * Traduce `ProyectoImpreso` (la forma de `GET /api/proyectos/:id`, en
 * `./tipos.ts`) al subconjunto estructural que pide `construirCotizacionPdf`
 * (`ProyectoCotizable`, en `@cotizador/shared`). Solo se llama cuando ya se
 * comprobó que hay una cotización vigente (`sinCotizacionVigente === false`),
 * así que el `[0]` es seguro.
 */
function adaptarProyectoCotizable(proyecto: ProyectoImpreso): ProyectoCotizable {
  const cotizacion = proyecto.cotizaciones[0];
  if (!cotizacion) {
    // No debería ocurrir: el caller ya garantizó `cotizaciones.length > 0`.
    throw new Error('adaptarProyectoCotizable: el proyecto no tiene cotización vigente.');
  }

  return {
    nombre: proyecto.nombre,
    localidadConsumo: proyecto.localidadConsumo,
    contacto: adaptarContactoCotizable(proyecto.contacto),
    cotizaciones: [cotizacion],
  };
}

/**
 * El contacto puede no existir (proyecto guardado antes de llegar al Paso 1
 * completo). `ContactoCotizable` no admite `null`; se degrada a campos
 * vacíos, que `construirCotizacionPdf` ya sabe convertir en "A QUIEN
 * CORRESPONDA" y demás valores por defecto.
 */
function adaptarContactoCotizable(contacto: ContactoImpreso | null): ContactoCotizable {
  if (!contacto) {
    return {
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      telefono: '',
      celular: '',
      localidad: '',
      estado: '',
      esEmpresa: false,
      razonSocial: '',
    };
  }

  return {
    nombre: contacto.nombre,
    apellidoPaterno: contacto.apellidoPaterno,
    apellidoMaterno: contacto.apellidoMaterno,
    telefono: contacto.telefono,
    celular: contacto.celular,
    localidad: contacto.localidad,
    estado: contacto.estado,
    esEmpresa: contacto.esEmpresa,
    razonSocial: contacto.razonSocial,
  };
}

/**
 * `useConfiguracion().empresa` está tipado como `DatosEmpresa` (el tipo del
 * wizard, en `proyectos/nuevo/types`), que no declara los campos propios del
 * documento impreso (`tituloCotizacion`, `introPlantilla`, `observaciones`,
 * `firmaNombre`, `firmaPuesto`) — aunque el backend sí los guarda y los
 * devuelve (`empresaSchema` en `packages/shared/src/schemas/configuracion.ts`
 * y el modelo `Empresa` de Prisma). Es un hueco en ese tipo del wizard, no en
 * los datos reales; se amplía aquí en vez de tocar `DatosEmpresa`, que usan
 * otras pantallas que no necesitan saber nada de esto.
 */
type EmpresaConImpresion = DatosEmpresa & Partial<Omit<EmpresaPdf, 'nombre' | 'telefono' | 'localidad' | 'email'>>;

function adaptarEmpresaPdf(empresa: DatosEmpresa | null): EmpresaPdf | null {
  if (!empresa) return null;

  const conImpresion = empresa as EmpresaConImpresion;
  return {
    nombre: conImpresion.nombre,
    telefono: conImpresion.telefono,
    localidad: conImpresion.localidad,
    email: conImpresion.email,
    tituloCotizacion: conImpresion.tituloCotizacion ?? '',
    introPlantilla: conImpresion.introPlantilla ?? '',
    observaciones: conImpresion.observaciones ?? '',
    firmaNombre: conImpresion.firmaNombre ?? '',
    firmaPuesto: conImpresion.firmaPuesto ?? '',
  };
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
