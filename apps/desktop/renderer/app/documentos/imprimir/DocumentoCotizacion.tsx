'use client';

import type { ReactNode } from 'react';
import type { DatosCotizacionPdf, LineaCotizacionPdf } from '@cotizador/shared';
import { paginarLineas } from './paginacion';

/**
 * Documento de cotización que acaba en el PDF.
 *
 * Reproduce, campo a campo, la plantilla aprobada por el cliente (ver
 * `docs/referencia-cotizacion/cotizacion-template.html` y su render con datos de ejemplo en
 * `docs/referencia-cotizacion/cotizacion-example.html`): mismo CSS, misma tipografía, mismo
 * layout de hoja carta. La diferencia es que aquí es JSX de verdad, no HTML
 * inyectado, y que la hoja se repite tantas veces como haga falta para que
 * ninguna línea de la tabla se pierda por el `overflow: hidden` de `.hoja`
 * (ver `paginacion.ts`).
 *
 * Toda la lógica de negocio (unir conceptos, cargos, descuento e IVA; cuadrar
 * el total; resolver quién es el cliente) ya la hizo `construirCotizacionPdf`
 * en `@cotizador/shared` — este componente solo pinta el `DatosCotizacionPdf`
 * resultante, que llega ya formateado y en el orden final.
 *
 * ## Dónde vive el `<style>` y por qué
 *
 * Se renderiza aquí dentro, en el cuerpo del documento (no con `precedence`,
 * para que React no lo suba al `<head>`). `globals.css` declara
 * `@page { margin: 16mm 14mm }` para los documentos legales (contrato, carta
 * poder); esta plantilla necesita margen 0 porque el espacio en blanco lo
 * pone el `padding` de `.hoja`. Al quedar después del `<link>` global en
 * orden de documento, el `@page { margin: 0 }` de aquí gana sin tener que
 * tocar `globals.css` ni arriesgar el margen de los documentos legales.
 * Como Electron abre una ventana nueva por cada PDF, nunca conviven ambos
 * documentos a la vez, así que esta regla nunca "se escapa" a otro tipo.
 *
 * El resto del CSS de la plantilla es CSS plano, sin `@layer`: por las
 * reglas de cascade layers gana sobre el preflight de Tailwind (que vive en
 * `@layer base`) sin necesidad de especificidad ni `!important`. Solo hace
 * falta corregir lo que la plantilla no declara explícitamente: el
 * `list-style: none` que el preflight pone en `ul` (se restaura a `disc` en
 * `.observaciones ul`) y el `max-width: 100%` que pone en `img` (se anula en
 * `.marca-agua` y `.logo`, que sí necesitan su ancho fijo en pulgadas).
 */
export function DocumentoCotizacion({ datos }: { datos: DatosCotizacionPdf }) {
  const paginas = paginarLineas(datos.lineas);
  const hayFirma = datos.firmaNombre.trim() !== '';

  return (
    <>
      <style>{CSS_PLANTILLA}</style>

      {paginas.map((pagina, indice) => (
        <div key={indice} className={indice === 0 ? 'hoja' : 'hoja salto-pagina-antes'}>
          {datos.mostrarLogo && (
            <img className="marca-agua" src="/zac-logo.png" alt="" data-documento-imagen />
          )}

          <div className="contenido">
            {pagina.esPrimera && (
              <>
                <div className="encabezado">
                  <div>
                    <h1>{datos.titulo}</h1>
                    <table className="datos">
                      <tbody>
                        <tr>
                          <td className="etiqueta">Fecha</td>
                          <td className="valor">{datos.fecha}</td>
                        </tr>
                        <tr>
                          <td className="etiqueta">Cliente</td>
                          <td className="valor">{datos.cliente}</td>
                        </tr>
                        <tr>
                          <td className="etiqueta">Ubicación del proyecto</td>
                          <td className="valor">{datos.ubicacion}</td>
                        </tr>
                        <tr>
                          <td className="etiqueta">Teléfono</td>
                          <td className="valor">{datos.telefono}</td>
                        </tr>
                        <tr>
                          <td className="etiqueta">Método de pago</td>
                          <td className="valor">{datos.metodoPago}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {datos.mostrarLogo && (
                    <img className="logo" src="/zac-logo.png" alt="Logo" data-documento-imagen />
                  )}
                </div>

                <p className="intro">{datos.intro}</p>
              </>
            )}

            <table className="conceptos">
              <thead>
                <tr>
                  <th className="col-desc">Descripción</th>
                  <th className="col-cant">Cantidad</th>
                  <th className="col-precio">Precio (MXN)</th>
                </tr>
              </thead>
              <tbody>
                {pagina.lineas.map((linea, indiceLinea) => (
                  <FilaConcepto key={indiceLinea} linea={linea} />
                ))}
              </tbody>
            </table>

            {pagina.esUltima && (
              <>
                <div className="pie-tabla">
                  <div className="observaciones">
                    <h3>Observaciones</h3>
                    <ul>
                      {datos.observaciones.map((observacion, indiceObs) => (
                        <li key={indiceObs}>{observacion}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="total-etiqueta">TOTAL</div>
                  <div className="total-valor">{formatearMXN(datos.total)}</div>
                </div>

                {hayFirma && (
                  <div className="firma">
                    <div className="linea" />
                    <div className="nombre">{datos.firmaNombre}</div>
                    <div>{datos.firmaPuesto}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function FilaConcepto({ linea }: { linea: LineaCotizacionPdf }) {
  return (
    <tr>
      <td className="col-desc">{renderizarDescripcion(linea.descripcion)}</td>
      <td className="col-cant">{linea.cantidad}</td>
      <td className="col-precio">{formatearMXN(linea.importe)}</td>
    </tr>
  );
}

const formateadorMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function formatearMXN(valor: number): string {
  return formateadorMXN.format(valor);
}

/**
 * `descripcion` admite `**negrita**` al estilo Markdown. Nunca se usa
 * `dangerouslySetInnerHTML`: se parte la cadena por los marcadores y los
 * tramos en negrita se devuelven como elementos `<b>` de JSX, el resto como
 * texto plano (que React escapa solo).
 */
function renderizarDescripcion(texto: string): ReactNode[] {
  // Con un grupo de captura, String.prototype.split intercala el contenido
  // capturado en el resultado: los índices impares son siempre el texto que
  // iba entre `**`.
  return texto
    .split(/\*\*(.+?)\*\*/g)
    .map((tramo, indice) => (indice % 2 === 1 ? <b key={indice}>{tramo}</b> : tramo));
}

/**
 * CSS de la plantilla aprobada, calcado de `docs/referencia-cotizacion/cotizacion-template.html`.
 * Dos diferencias intencionales frente al original, documentadas en el
 * ticket:
 *  - `.conceptos td` usa `min-height` en vez de `height`: con alto fijo, una
 *    descripción larga se desborda visualmente sin que la paginación (que
 *    cuenta filas, no líneas de texto) lo detecte.
 *  - Se añaden `list-style: disc` en `.observaciones ul` y `max-width: none`
 *    en `.marca-agua`/`.logo` para contrarrestar el preflight de Tailwind
 *    (ver el comentario de arriba del componente).
 */
const CSS_PLANTILLA = `
  :root {
    --azul-header: #3fa9f5;
    --azul-celda: #cfe8fb;
    --azul-borde: #6f8fe8;
    --azul-total: #2e74b5;
    --azul-total-borde: #1f4e8c;
    --texto: #1a1a1a;
    --borde-tabla: #b9c7d8;
  }

  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: var(--texto);
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    font-size: 11pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .hoja {
    position: relative;
    width: 8.5in;
    height: 11in;
    margin: 0 auto;
    padding: 0.45in 0.5in 0.5in;
    overflow: hidden;
  }

  .marca-agua {
    position: absolute;
    left: 50%;
    top: 1.6in;
    transform: translateX(-50%);
    width: 8in;
    max-width: none;
    opacity: 0.1;
    z-index: 0;
    pointer-events: none;
  }
  .contenido { position: relative; z-index: 1; }

  .encabezado {
    display: grid;
    grid-template-columns: 1fr 2.2in;
    gap: 0.15in;
    align-items: start;
  }
  h1 {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-weight: 700;
    font-size: 21pt;
    margin: 0.05in 0 8px 0.1in;
    letter-spacing: 0.2px;
  }
  .logo {
    width: 100%;
    max-width: none;
    max-height: 2in;
    object-fit: contain;
    margin-top: -0.1in;
  }

  .datos {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    background: rgba(255,255,255,0.9);
  }
  .datos td {
    border: 2px solid var(--azul-borde);
    padding: 4px 8px;
    height: 26px;
  }
  .datos td.etiqueta {
    width: 45%;
    background: var(--azul-celda);
    font-weight: 600;
  }
  .datos td.etiqueta::before { content: '•'; margin-right: 8px; }
  .datos td.valor { text-align: center; }

  .intro {
    margin: 14px 0 12px;
    font-size: 11pt;
    line-height: 1.3;
  }

  .conceptos {
    width: 86%;
    border-collapse: collapse;
    font-size: 9.5pt;
    background: rgba(255,255,255,0.85);
  }
  .conceptos thead th {
    background: var(--azul-header);
    color: #111;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    height: 52px;
    border: 1px solid var(--borde-tabla);
  }
  .conceptos td {
    border: 1px solid var(--borde-tabla);
    padding: 6px;
    min-height: 56px;
    vertical-align: middle;
  }
  .conceptos .col-desc { text-align: left; }
  .conceptos th.col-desc { text-align: center; }
  .conceptos .col-cant { width: 13%; text-align: center; }
  .conceptos .col-precio { width: 16%; text-align: center; }

  .pie-tabla {
    width: 86%;
    display: grid;
    grid-template-columns: 1fr 13% 16%;
    align-items: start;
    margin-top: 6px;
  }
  .observaciones h3 {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 10pt;
    text-transform: uppercase;
    margin: 0;
    letter-spacing: 0.3px;
  }
  .observaciones ul {
    list-style: disc;
    margin: 0;
    padding-left: 12px;
    font-size: 9pt;
    line-height: 1.35;
  }
  .total-etiqueta, .total-valor {
    background: var(--azul-total);
    color: #fff;
    border: 2px solid var(--azul-total-borde);
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
  }

  .firma {
    margin: 0.55in auto 0;
    width: 3.6in;
    text-align: center;
    font-size: 11pt;
    line-height: 1.35;
  }
  .firma .linea {
    border-top: 3px solid #222;
    width: 2.8in;
    margin: 0 auto 6px;
  }
  .firma .nombre { text-transform: uppercase; }
`;
