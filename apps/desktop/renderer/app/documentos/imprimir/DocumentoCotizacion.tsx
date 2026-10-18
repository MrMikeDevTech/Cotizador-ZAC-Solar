'use client';

import {
  ResumenEmpresa,
  ResumenContactoConsumo,
  ResumenEquipo,
  ResumenAhorro,
  TablaConsumoHistorico,
  ResumenCotizacion,
} from '../../proyectos/nuevo/components/confirmacion';
import type { DatosEmpresa, TipoMoneda } from '../../proyectos/nuevo/types';
import type { ProyectoImpreso } from './tipos';

/**
 * Documento de cotización que acaba en el PDF.
 *
 * ## Qué es esto y qué NO es
 *
 * Esta es la **maqueta del documento**, el sitio donde se diseña lo que ve el
 * cliente. Está deliberadamente separada de `page.tsx`, que se ocupa de la
 * fontanería (leer la query string, pedir el proyecto al backend y avisar a
 * Electron de que ya puede imprimir). Para rediseñar la cotización solo hay
 * que tocar este archivo: nada de lo de al lado necesita cambiar.
 *
 * Hoy reutiliza los mismos bloques que el Paso 5 muestra en pantalla, que es
 * un punto de partida correcto pero **no un documento comercial**: le faltan
 * portada con logo, numeración de páginas, vigencia de la cotización,
 * condiciones de pago y firmas.
 *
 * ## Lo que ya está resuelto y conviene no romper
 *
 * - **Fondos de color**: `printToPDF` va con `printBackground: true` y
 *   `globals.css` fuerza `print-color-adjust: exact`. Sin eso Chromium
 *   descarta el azul corporativo y las bandas de las tablas.
 * - **Tamaño y márgenes**: los decide `@page` en `globals.css` (carta,
 *   16/14 mm), porque Electron manda `preferCSSPageSize: true` con márgenes
 *   en 0. Se ajustan ahí, sin recompilar Electron.
 * - **Paginación**: hay dos utilidades listas en `globals.css`:
 *   `.salto-pagina-antes` para empezar una página nueva y `.evitar-corte`
 *   para que un bloque no se parta por la mitad. Las tablas y los bloques de
 *   firma casi siempre quieren `.evitar-corte`.
 *
 * ## Cómo probarlo sin generar un PDF cada vez
 *
 * La ruta es una página normal: abre
 * `/documentos/imprimir/?tipo=cotizacion&proyectoId=<id>` en el navegador y
 * diseña con recarga en caliente. Para ver el resultado paginado de verdad,
 * usa la vista previa de impresión del navegador, que respeta `@page` y las
 * utilidades de corte igual que el PDF final.
 *
 * ## De dónde sale cada dato
 *
 * Todo llega en `proyecto`, tal cual lo devuelve `GET /api/proyectos/:id`.
 * La forma está en `./tipos.ts`. La cotización vigente es
 * `proyecto.cotizaciones[0]`; puede no existir si el proyecto se guardó como
 * borrador antes de llegar al Paso 4, y por eso casi todo va bajo un guard.
 */
export function DocumentoCotizacion({
  proyecto,
  empresa,
}: {
  proyecto: ProyectoImpreso;
  /** `null` si todavía no se capturaron los datos: el bloque se omite. */
  empresa: DatosEmpresa | null;
}) {
  const cotizacion = proyecto.cotizaciones?.[0];

  // El backend guarda la moneda como texto libre; aquí se estrecha al tipo
  // que entienden los componentes, cayendo a MXN ante cualquier otra cosa.
  const tipoMoneda: TipoMoneda = cotizacion?.tipoMoneda === 'USD' ? 'USD' : 'MXN';

  const pagoPromedioCFE = proyecto.consumos.length
    ? proyecto.consumos.reduce((total, c) => total + c.pago, 0) / proyecto.consumos.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-6 text-gray-700">
      {/* ── Encabezado ──────────────────────────────────────────────────
          Aquí es donde más falta hace trabajo de diseño: logo, folio,
          fecha de emisión y vigencia de la cotización. */}
      <ResumenEmpresa empresa={empresa} />

      <ResumenContactoConsumo
        datosContacto={
          {
            nombre: proyecto.contacto?.nombre,
            apellidoPaterno: proyecto.contacto?.apellidoPaterno,
            apellidoMaterno: proyecto.contacto?.apellidoMaterno,
            localidad: proyecto.contacto?.localidad,
            estado: proyecto.contacto?.estado,
            telefono: proyecto.contacto?.telefono,
            celular: proyecto.contacto?.celular,
            email: proyecto.contacto?.email,
            fuenteContacto: proyecto.contacto?.fuenteContacto,
          } as never
        }
        nombreProyecto={proyecto.nombre}
        nombreRecibo={proyecto.nombreRecibo}
        tarifaSeleccionada={proyecto.tarifa}
        numeroServicio={proyecto.numeroServicio}
        periodo={proyecto.periodo}
      />

      {cotizacion && (
        <>
          <div className="evitar-corte">
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
          </div>

          <div className="evitar-corte">
            <ResumenAhorro
              pagoPromedioCFE={pagoPromedioCFE}
              nuevoPago={cotizacion.nuevoPago}
              ahorro={cotizacion.ahorroPeriodo}
              periodo={proyecto.periodo}
            />
          </div>
        </>
      )}

      <div className="evitar-corte">
        <TablaConsumoHistorico
          consumos={proyecto.consumos.map((c) => ({
            inicioStr: c.inicioStr,
            terminoStr: c.terminoStr,
            kwh: String(c.kwh),
            pago: String(c.pago),
          }))}
        />
      </div>

      {/* ── Cotización ──────────────────────────────────────────────────
          El desglose económico empieza en página propia: es lo que el
          cliente busca y no conviene que quede partido tras la tabla de
          consumos. */}
      {cotizacion && (
        <div className="salto-pagina-antes evitar-corte">
          <ResumenCotizacion
            conceptos={cotizacion.conceptos.map((c) => ({
              id: c.id,
              concepto: c.concepto,
              costoBase: c.costoBase,
              margenPorcentaje: c.margenPorcentaje,
            }))}
            estructuraActual={
              cotizacion.estructuraId
                ? {
                    id: cotizacion.estructuraId,
                    nombre: cotizacion.estructuraNombre ?? '',
                    precio: cotizacion.estructuraPrecio ?? 0,
                  }
                : undefined
            }
            cargosEditables={cotizacion.cargos.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              monto: c.monto,
            }))}
            subtotalConDescuento={cotizacion.subtotalConDescuento}
            granTotal={cotizacion.granTotal}
            incluirIva={cotizacion.incluirIva}
            tipoMoneda={tipoMoneda}
          />
        </div>
      )}

      {/* ── Pie ─────────────────────────────────────────────────────────
          Pendiente de diseño: vigencia, condiciones de pago, tiempo de
          instalación, garantías y espacio de firmas. Lleva `.evitar-corte`
          para que el bloque de firmas no se parta entre dos páginas. */}
    </div>
  );
}
