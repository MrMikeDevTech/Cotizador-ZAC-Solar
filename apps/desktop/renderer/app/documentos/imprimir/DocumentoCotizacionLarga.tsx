'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatearDinero } from '@cotizador/shared';
import type { DatosCotizacionLargaPdf, GraficaPdf } from '@cotizador/shared';
import { paginarCotizacionLarga } from './paginacionLarga';

/**
 * Cotización larga (7 hojas) que acaba en el PDF.
 *
 * Porta a JSX la plantilla `docs/referencia-cotizacion/cotizacion-larga-template.html`
 * (y su render `-example.html`): mismos textos fijos, colores y coordenadas.
 * Toda la lógica y el formato los resolvió `construirCotizacionLargaPdf` en
 * `@cotizador/shared`; aquí solo se coloca texto.
 *
 * ## A4 → Letter
 *
 * La plantilla está maquetada en pt sobre A4 (595.28 × 841.89) con
 * posicionamiento absoluto. El PDF de esta app es Letter (612 × 792), así que
 * cada hoja contiene un `.lienzo` con las medidas A4 originales al que se
 * aplica una **escala uniforme** (`--escala`, la que hace caber el alto A4 en
 * el alto Letter) y se centra en horizontal. Escala uniforme = ninguna
 * coordenada de la plantilla se reinterpreta ni se deforma.
 *
 * Lo que debe llegar al borde de la hoja (banda del pie, banda de la hoja 6 y
 * marca de agua) se dibuja a ancho Letter completo, compensando el margen que
 * deja el lienzo escalado.
 */
export function DocumentoCotizacionLarga({ datos }: { datos: DatosCotizacionLargaPdf }) {
  const hojasCotizacion = paginarCotizacionLarga(datos.cotizacion.lineas);

  return (
    <div className="cl">
      <style>{CSS_PLANTILLA}</style>

      {/* Hoja 1 · Consumo histórico */}
      <Hoja datos={datos}>
        <Texto x={50.7} y={86.65} size={30} bold ancho={477.5} centrado>
          Consumo histórico
        </Texto>
        <table className="tbl t-hist" style={{ left: '50.7pt', top: '227.9pt', width: '477.5pt' }}>
          <colgroup>
            <col style={{ width: '117.4pt' }} />
            <col style={{ width: '121.4pt' }} />
            <col style={{ width: '121.4pt' }} />
            <col style={{ width: '117.3pt' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Inicio</th>
              <th>Término</th>
              <th>kWh</th>
              <th>Pago a CFE</th>
            </tr>
          </thead>
          <tbody>
            {datos.consumoHistorico.map((fila, i) => (
              <tr key={i}>
                <td>{fila.inicio}</td>
                <td>{fila.termino}</td>
                <td>{fila.kwh}</td>
                <td>{fila.pagoCfe}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              <td />
              <td>{datos.totalKwh}</td>
              <td>{datos.totalPagoCfe}</td>
            </tr>
          </tbody>
        </table>
      </Hoja>

      {/* Hoja 2 · Comparativo de consumo anual */}
      <Hoja datos={datos}>
        <Texto x={178.7} y={66.45} size={30} bold>
          Comparativo
          <br />
          de consumo anual
        </Texto>
        <Grafica
          id="g1"
          titulo="Gráfica comparativa de consumo"
          tituloX={46.7}
          tituloY={172.24}
          cajaY={227.1}
          etiquetasYTop={250.74}
          etiquetasXTop={396.14}
          leyendaY={273.78}
          grafica={datos.graficaConsumo}
          serieA={datos.graficaConsumo.puntosConsumo}
          serieB={datos.graficaConsumo.puntosProduccion}
          nombreA="Consumo"
          nombreB="Producción"
          formatearEtiquetaY={(v) => `${v} kWh -`}
        />
        <Grafica
          id="g2"
          titulo="Gráfica comparativa de pagos"
          tituloX={48.7}
          tituloY={452.24}
          cajaY={510.1}
          etiquetasYTop={533.74}
          etiquetasXTop={679.14}
          leyendaY={556.78}
          grafica={datos.graficaPagos}
          serieA={datos.graficaPagos.puntosHistorico}
          serieB={datos.graficaPagos.puntosNuevo}
          nombreA="Pago histórico"
          nombreB="Nuevos pagos"
          formatearEtiquetaY={(v) => `$ ${v} -`}
        />
      </Hoja>

      {/* Hoja 3 · Retorno de inversión */}
      <Hoja datos={datos}>
        <Texto x={178.7} y={93.65} size={30} bold>
          Retorno de inversión
        </Texto>
        <table className="tbl t-roi" style={{ left: '58.7pt', top: '203.9pt', width: '492pt' }}>
          <colgroup>
            {[64, 68, 68, 68, 76, 72, 76].map((w, i) => (
              <col key={i} style={{ width: `${w}pt` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>Inicio</th>
              <th>Término</th>
              <th>
                Consumo
                <br />
                histórico
              </th>
              <th>
                Energía
                <br />
                generada por
                <br />
                el sistema
              </th>
              <th>
                Nuevo pago a<br />
                CFE
              </th>
              <th>Pago histórico</th>
              <th className="ahorro">
                Ahorro por
                <br />
                periodo
              </th>
            </tr>
          </thead>
          <tbody>
            {datos.retornoInversion.map((fila, i) => (
              <tr key={i}>
                <td>{fila.inicio}</td>
                <td>{fila.termino}</td>
                <td>{fila.consumoHistorico} kWh</td>
                <td>{fila.energiaGenerada} kWh</td>
                <td>{fila.nuevoPagoCfe}</td>
                <td>{fila.pagoHistorico}</td>
                <td>{fila.ahorroPeriodo}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Ahorro anual</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td>{datos.ahorroAnual}</td>
            </tr>
          </tbody>
        </table>
        {!datos.usoTarifaReal && (
          <Texto x={58.7} y={690} size={8} ancho={492}>
            Cifras estimadas con el costo promedio por kWh de tu recibo histórico.
          </Texto>
        )}
      </Hoja>

      {/* Hoja 4 · Tecnología utilizada */}
      <Hoja datos={datos}>
        <Texto x={157.7} y={90.65} size={30} bold>
          Tecnología utilizada
        </Texto>
        <Texto x={64.7} y={202.19} size={14} bold>
          Paneles solares
        </Texto>
        <Texto x={220.8} y={223.55} size={9}>
          Especificaciones
        </Texto>
        <Especificaciones x={220.8} y={248.2} equipo={datos.panel} />
        <Texto x={78.7} y={354.19} size={14} bold>
          {datos.inversor.tipo === 'Microinversor' ? 'Microinversores' : 'Inversores'}
        </Texto>
        <Texto x={234.8} y={375.55} size={9}>
          Especificaciones
        </Texto>
        <Especificaciones x={234.8} y={400.2} equipo={datos.inversor} />
      </Hoja>

      {/* Hoja 5 · Garantías (texto fijo; solo el concepto del inversor cambia según el tipo de equipo) */}
      <Hoja datos={datos}>
        <Texto x={0} y={86.65} size={30} bold ancho={595.28} centrado>
          Garantías
        </Texto>
        <table className="tbl t-gar" style={{ left: '50.7pt', top: '213.9pt', width: '477.5pt' }}>
          <colgroup>
            <col style={{ width: '170pt' }} />
            <col style={{ width: '307.5pt' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Plazo y alcance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Paneles solares</th>
              <td>
                <b>12 años</b> contra defectos de fabricación.
              </td>
            </tr>
            <tr>
              <th scope="row">Potencia de los paneles</th>
              <td>
                Mínimo <b>90 %</b> a los <b>10 años</b> y <b>80 %</b> a los <b>25 años</b>.
              </td>
            </tr>
            <tr>
              <th scope="row">{datos.inversor.tipo}</th>
              <td>
                <b>2 años.</b>
              </td>
            </tr>
            <tr>
              <th scope="row">Estructura de montaje</th>
              <td>
                <b>1 año.</b>
              </td>
            </tr>
            <tr>
              <th scope="row">
                Instalación eléctrica
                <br />y cableado
              </th>
              <td>
                <b>1 año.</b>
              </td>
            </tr>
            <tr>
              <th scope="row">
                Mano de obra
                <br />
                de instalación
              </th>
              <td>
                <b>1 año</b>, por fallas atribuibles al trabajo realizado.
              </td>
            </tr>
          </tbody>
        </table>
        <div className="nota-gar">
          <div className="nota-tit">Aplicación en cada cotización</div>
          Las garantías de paneles e inversores deben coincidir con las condiciones del fabricante y
          quedar especificadas en cada cotización. El plazo del inversor debe indicarse
          expresamente: <b>1 o 2 años</b>, según corresponda.
        </div>
      </Hoja>

      {/* Hoja 6 · Beneficios */}
      <Hoja datos={datos} bandaAtras>
        <Texto x={157.7} y={87.65} size={30} bold>
          Entérate de los beneficios
        </Texto>

        <Texto x={50.7} y={207.59} size={14} bold>
          El medio ambiente
        </Texto>
        <Texto x={50.7} y={231.05} size={9} ancho={146}>
          Tu sistema podrá aportar al año un beneficio ambiental de:
        </Texto>
        <Dato x={236.8} y={228.95} etiqueta="Sin Emitir">
          {datos.beneficios.co2Kg} kg CO<span className="sub">2</span>
        </Dato>
        <Dato x={346.8} y={228.95} etiqueta="Plantar">
          {datos.beneficios.arboles} árboles
        </Dato>
        <Dato x={439.9} y={228.95} etiqueta="Sin manejar auto">
          {datos.beneficios.kmAuto} km
        </Dato>

        <Texto x={50.7} y={308.59} size={14} bold>
          El gasto total
        </Texto>
        <Texto x={50.7} y={332.05} size={9} ancho={146}>
          Por {datos.proyeccion.anios} años, tus gastos se reducirán bastante.
        </Texto>
        <Dato x={236.8} y={329.95} etiqueta="Sin Paneles">
          {datos.proyeccion.gastoSinPaneles}
        </Dato>
        <Dato x={332.1} y={329.95} etiqueta="Con Paneles">
          {datos.proyeccion.gastoConPaneles}
        </Dato>
        <Dato x={430.3} y={329.95} etiqueta="Tu ahorro será de">
          {datos.proyeccion.ahorro}
        </Dato>

        <Texto x={52.7} y={401.49} size={14} bold>
          Tu inversión
        </Texto>
        <Texto x={52.7} y={424.85} size={9} ancho={148}>
          En poco tiempo verás recuperada tu inversión
        </Texto>
        <Dato x={238.8} y={422.75} etiqueta="Recuperación de inversión en" tamano={9}>
          {datos.proyeccion.recuperacionInversion}
        </Dato>
        <Dato x={396.5} y={422.75} etiqueta="Tasa interna de retorno" tamano={9}>
          {datos.proyeccion.tir}
        </Dato>
        <Texto x={52.7} y={475.94} size={12} bold>
          * Flujos acumulados
        </Texto>

        <Texto x={60.7} y={553.95} size={16} bold>
          Comparación de pagos a CFE
        </Texto>
        <Texto x={60.7} y={576.24} size={12}>
          Si aún no te convences, espera a que veas esto.
        </Texto>
        <Texto x={56.7} y={610.55} size={16} bold>
          Sin Paneles
        </Texto>
        <Texto x={206.4} y={610.55} size={16} bold>
          Con Paneles
        </Texto>
        <Texto x={356.2} y={610.55} size={16} bold>
          Ahorro
        </Texto>
        <Texto x={60.7} y={642.94} size={12}>
          Actualmente pagas
        </Texto>
        <Texto x={210.4} y={642.94} size={12}>
          Ahora pagarás
        </Texto>
        <Texto x={360.2} y={642.94} size={12} ancho={125}>
          Al periodo dejarás de pagar
        </Texto>
        <Texto x={60.7} y={675.15} size={16} bold>
          {datos.proyeccion.pagoPromedioSinPaneles}
        </Texto>
        <Texto x={210.4} y={675.15} size={16} bold>
          {datos.proyeccion.pagoPromedioConPaneles}
        </Texto>
        <Texto x={360.2} y={675.15} size={16} bold color="#F3AE00">
          {datos.proyeccion.ahorroPromedio}
        </Texto>
        <Texto x={72.6} y={712.05} size={9}>
          * Pagos por periodo promedio
        </Texto>
      </Hoja>

      {/* Hoja 7 · Cotización (una o más hojas, ver `paginacionLarga.ts`) */}
      {hojasCotizacion.map((hoja, indice) => (
        <Hoja key={`cotizacion-${indice}`} datos={datos}>
          <Texto x={indice === 0 ? 231.7 : 190} y={22.65} size={30} bold>
            {indice === 0 ? 'Cotización' : 'Cotización (cont.)'}
          </Texto>
          {indice === 0 && (
            <>
              <Texto x={67.7} y={84} size={11} ancho={480}>
                <b>Ubicación del proyecto:</b> {datos.ubicacion}
              </Texto>
              <Texto x={67.7} y={106} size={11} ancho={480}>
                <b>Método de pago:</b> {datos.metodoPago}
              </Texto>
            </>
          )}
          <table className="tbl t-cot" style={{ left: '67.7pt', top: '148.5pt', width: '480pt' }}>
            <colgroup>
              {[62, 98, 62, 98, 62, 98].map((w, i) => (
                <col key={i} style={{ width: `${w}pt` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th colSpan={4} className="h-desc">
                  Descripción
                </th>
                <th colSpan={2} className="h-total">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {hoja.lineas.map((linea, i) => (
                <tr key={i} className="fila">
                  <td colSpan={4} className="desc">
                    {linea.descripcion}
                  </td>
                  <td colSpan={2} className="imp">
                    {formatearDinero(linea.importe)}
                  </td>
                </tr>
              ))}
              {hoja.esUltima && (
                <tr className="totales">
                  <td className="l">Subtotal</td>
                  <td className="imp">{datos.cotizacion.subtotal}</td>
                  <td className="l">IVA</td>
                  <td className="imp">{datos.cotizacion.iva}</td>
                  <td className="l tt">Total</td>
                  <td className="imp tt">{datos.cotizacion.total}</td>
                </tr>
              )}
            </tbody>
          </table>
          {hoja.esUltima && (
            <div className="firmas">
              <div className="firma">
                <div className="linea" />
                <div className="nombre">{datos.clienteNombre}</div>
                <div className="rol">Firma del cliente</div>
              </div>
              <div className="firma">
                <div className="linea" />
                <div className="nombre">{datos.asesorNombre}</div>
                <div className="rol">Elaboró la cotización</div>
              </div>
            </div>
          )}
        </Hoja>
      ))}
    </div>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────

/** Una hoja Letter con su lienzo A4 escalado, la marca de agua y el pie de contacto. */
function Hoja({
  datos,
  children,
  bandaAtras = false,
}: {
  datos: DatosCotizacionLargaPdf;
  children: ReactNode;
  /** Hoja 6: la banda gris de "Comparación de pagos" va detrás del contenido. */
  bandaAtras?: boolean;
}) {
  const { empresa } = datos;
  return (
    <section className="hoja">
      <img className="marca-agua" src="/logo-cotizacion.jpeg" alt="" data-documento-imagen />
      {/* El pie se ancla al borde inferior de la hoja Letter (no al lienzo escalado):
          así llega hasta el borde sin franja blanca aunque cambie la escala. */}
      <div className="pie" />
      <div className="lienzo">
        {bandaAtras && <div className="banda" />}
        {children}
        <Texto x={132.6} y={751.54} size={12} color="#fff">
          Contacto
        </Texto>
        <Texto x={314.1} y={751.54} size={12} bold color="#fff">
          {empresa.nombre}
        </Texto>
        <Texto x={132.6} y={780.55} size={9} color="#fff">
          {empresa.correo}
        </Texto>
        <Texto x={314.1} y={780.55} size={9} color="#fff">
          {empresa.web}
        </Texto>
        <Texto x={132.6} y={796.15} size={9} color="#fff">
          {empresa.direccion}
        </Texto>
        <Texto x={314.1} y={796.15} size={9} color="#fff">
          {empresa.telefono}
        </Texto>
      </div>
    </section>
  );
}

/** Texto posicionado en pt sobre el lienzo, como los `.t` de la plantilla. */
function Texto({
  x,
  y,
  size,
  bold = false,
  color,
  ancho,
  centrado = false,
  children,
}: {
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  color?: string;
  /** Con ancho, el texto puede partirse en varias líneas; sin él, va en una. */
  ancho?: number;
  centrado?: boolean;
  children: ReactNode;
}) {
  const estilo: CSSProperties = {
    left: `${x}pt`,
    top: `${y}pt`,
    fontSize: `${size}pt`,
    ...(bold && { fontWeight: 700 }),
    ...(color && { color }),
    ...(ancho !== undefined && { width: `${ancho}pt`, whiteSpace: 'normal' }),
    ...(centrado && { textAlign: 'center' }),
  };
  return (
    <div className={size === 30 ? 't title' : 't'} style={estilo}>
      {children}
    </div>
  );
}

/** Etiqueta pequeña con su cifra destacada debajo (hoja 6). */
function Dato({
  x,
  y,
  etiqueta,
  tamano = 10,
  children,
}: {
  x: number;
  y: number;
  etiqueta: string;
  tamano?: number;
  children: ReactNode;
}) {
  return (
    <>
      <Texto x={x} y={y} size={9}>
        {etiqueta}
      </Texto>
      <Texto x={x} y={y + (tamano === 9 ? 10.6 : 10.53)} size={tamano} bold color="#F3AE00">
        {children}
      </Texto>
    </>
  );
}

function Especificaciones({
  x,
  y,
  equipo,
}: {
  x: number;
  y: number;
  equipo: { modelo: string; marca: string; cantidad: number };
}) {
  return (
    <table className="tbl t-spec" style={{ left: `${x}pt`, top: `${y}pt`, minWidth: '174.4pt' }}>
      <tbody>
        <tr>
          <td>Modelo</td>
          <td>{equipo.modelo}</td>
        </tr>
        <tr>
          <td>Marca</td>
          <td>{equipo.marca}</td>
        </tr>
        <tr>
          <td>Cantidad</td>
          <td>{equipo.cantidad}</td>
        </tr>
      </tbody>
    </table>
  );
}

interface PropsGrafica {
  /** Prefijo de los ids de marcador SVG; debe ser único por gráfica. */
  id: string;
  titulo: string;
  tituloX: number;
  tituloY: number;
  cajaY: number;
  etiquetasYTop: number;
  etiquetasXTop: number;
  leyendaY: number;
  grafica: GraficaPdf;
  serieA: string;
  serieB: string;
  nombreA: string;
  nombreB: string;
  formatearEtiquetaY: (valor: string) => string;
}

function Grafica(props: PropsGrafica) {
  const { id, grafica } = props;
  const marcador = (sufijo: string, color: string) => (
    <marker
      id={`${id}-${sufijo}`}
      markerUnits="userSpaceOnUse"
      markerWidth="4"
      markerHeight="4"
      refX="2"
      refY="2"
      overflow="visible"
    >
      <circle cx="2" cy="2" r="2" fill={color} />
    </marker>
  );
  const marcadores = (sufijo: string) => ({
    markerStart: `url(#${id}-${sufijo})`,
    markerMid: `url(#${id}-${sufijo})`,
    markerEnd: `url(#${id}-${sufijo})`,
  });

  return (
    <>
      <Texto x={props.tituloX} y={props.tituloY} size={12}>
        {props.titulo}
      </Texto>
      <div className="chart-box" style={{ top: `${props.cajaY}pt` }} />
      <svg
        className="chart-svg"
        style={{ left: '46.7pt', top: `${props.cajaY}pt` }}
        width="481.9pt"
        height="198.4pt"
        viewBox="0 0 481.9 198.4"
      >
        <defs>
          {marcador('ma', '#93B376')}
          {marcador('mb', '#1F8666')}
        </defs>
        <line x1="70.9" y1="28.3" x2="70.9" y2="170.1" stroke="#000" strokeWidth="1" />
        <line x1="70.9" y1="170.1" x2="411" y2="170.1" stroke="#000" strokeWidth="1" />
        <polyline
          points={props.serieA}
          fill="none"
          stroke="#93B376"
          strokeWidth="1.5"
          {...marcadores('ma')}
        />
        <polyline
          points={props.serieB}
          fill="none"
          stroke="#1F8666"
          strokeWidth="1.5"
          {...marcadores('mb')}
        />
        <line x1="430" y1="31.6" x2="450" y2="31.6" stroke="#93B376" strokeWidth="10" strokeLinecap="round" />
        <line x1="430" y1="71.6" x2="450" y2="71.6" stroke="#1F8666" strokeWidth="10" strokeLinecap="round" />
      </svg>
      <div className="ylabels" style={{ top: `${props.etiquetasYTop}pt` }}>
        {grafica.ejeY.map((valor, i) => (
          <div key={i}>{props.formatearEtiquetaY(valor)}</div>
        ))}
      </div>
      <div className="xlabels" style={{ top: `${props.etiquetasXTop}pt` }}>
        {grafica.ejeX.map((punto, i) => (
          <div key={i}>
            <span>{punto.mes}</span>
            <span>{punto.anio}</span>
          </div>
        ))}
      </div>
      <Texto x={466.7} y={props.leyendaY} size={10} color="#000">
        {props.nombreA}
      </Texto>
      <Texto x={466.7} y={props.leyendaY + 30} size={10} color="#000">
        {props.nombreB}
      </Texto>
    </>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────

/**
 * CSS plano (sin `@layer`) para ganar al preflight de Tailwind, igual que en
 * `DocumentoCotizacion`. Todo va bajo `.cl` para no tocar otros documentos.
 *
 * Constantes de escala: A4 = 595.28 × 841.89 pt; Letter = 612 × 792 pt.
 * `--escala` = 792 / 841.89 (el alto A4 llena exactamente el alto Letter).
 * `--extra` = (612 − 595.28 · escala) / 2 / escala: lo que sobra a cada lado
 * del lienzo, medido en pt del propio lienzo (sin escalar). Sirve para
 * centrarlo y para que las bandas lleguen al borde de la hoja.
 */
const CSS_PLANTILLA = `
@page { size: letter; margin: 0; }
.cl, .cl * { box-sizing: border-box; margin: 0; padding: 0; }
.cl {
  --escala: 0.94073;
  --extra: 27.6pt;
  font-family: Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #25314D;
  line-height: 1.1719;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cl .hoja {
  position: relative;
  width: 612pt;
  height: 792pt;
  overflow: hidden;
  background: #fff;
  break-after: page;
  page-break-after: always;
}
.cl .hoja:last-child { break-after: auto; page-break-after: auto; }
@media screen {
  .cl .hoja { margin: 14px auto; box-shadow: 0 1px 6px rgba(0,0,0,.25); }
}

.cl .lienzo {
  position: absolute;
  /* \`zoom\` y no \`transform: scale\`: el transform deja la caja de layout en 841.89pt
     (más alta que la hoja de 792pt) y al imprimir Chrome empuja a la página
     siguiente lo que cruza ese límite, que \`overflow: hidden\` recorta. Con zoom la
     caja mide 792pt. Las longitudes propias del lienzo (left) también se escalan. */
  left: var(--extra);
  top: 0;
  width: 595.28pt;
  height: 841.89pt;
  zoom: var(--escala);
}

.cl .marca-agua {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 376pt;
  height: 376pt;
  max-width: none;
  transform: translate(-50%, -50%);
  object-fit: contain;
  opacity: .09;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.cl .t { position: absolute; white-space: nowrap; font-size: 12pt; color: #25314D; }
.cl .title { font-size: 30pt; font-weight: 700; }
.cl .sub { font-size: 6pt; position: relative; top: 2.4pt; line-height: 0; }
.cl .pie { position: absolute; left: 0; right: 0; bottom: 0; height: calc(113.4pt * var(--escala)); background: #25314D; }
.cl .banda { position: absolute; left: calc(-1 * var(--extra)); top: 523.6pt; width: calc(595.28pt + 2 * var(--extra)); height: 230.7pt; background: rgba(0,0,0,.031); }

.cl .tbl { position: absolute; border-collapse: separate; border-spacing: 0; table-layout: fixed; color: #25314D; }
.cl .tbl th { font-weight: 400; text-align: left; vertical-align: top; }
.cl .tbl td { vertical-align: top; }

.cl .t-hist { font-size: 12pt; }
.cl .t-hist thead tr { background: #F3AE00; }
.cl .t-hist th { height: 38pt; padding: 8.94pt 5pt 0; border-bottom: 5.7pt solid #fff; color: #fff; }
.cl .t-hist td { height: 24pt; padding: 1.94pt 5pt 0; }
.cl .t-hist tbody tr:nth-child(even) { background: rgba(0,0,0,.133); }
.cl .t-hist tbody tr.total { background: transparent; }

.cl .chart-box { position: absolute; left: 46.7pt; width: 481.9pt; height: 198.4pt; background: rgba(0,0,0,.039); }
.cl .chart-svg { position: absolute; overflow: visible; max-width: none; }
.cl .ylabels { position: absolute; left: 46.7pt; width: 70.9pt; text-align: right; font-size: 12pt; color: #000; white-space: nowrap; }
.cl .ylabels > div { height: 27.62pt; }
.cl .xlabels { position: absolute; left: 120.6pt; display: flex; font-size: 10pt; color: #000; }
.cl .xlabels > div { width: 56.7pt; }
.cl .xlabels span { display: block; line-height: 13pt; }

.cl .t-roi { font-size: 8.5pt; }
.cl .t-roi thead tr { background: #F3AE00; }
.cl .t-roi th { height: 40.9pt; padding: 8.94pt 5pt 0; color: #fff; }
.cl .t-roi th.ahorro { background: #E39C0E; }
.cl .t-roi td { height: 24pt; padding: 8.94pt 5pt 0; }
.cl .t-roi tbody tr:nth-child(even) { background: rgba(0,0,0,.133); }
.cl .t-roi tbody tr.total { background: transparent; }

.cl .t-spec { font-size: 9pt; font-weight: 700; line-height: 10.5pt; table-layout: auto; }
.cl .t-spec td { padding: 4.85pt 4pt; white-space: nowrap; }
.cl .t-spec td:first-child { padding-right: 28pt; }
.cl .t-spec td:last-child { text-align: right; }
.cl .t-spec tr:nth-child(even) { background: rgba(0,0,0,.133); }

.cl .t-cot { font-size: 11pt; }
.cl .t-cot th { height: 26.6pt; padding: 7.78pt 0 0; font-size: 10pt; font-weight: 700; border-bottom: 1pt solid; }
.cl .t-cot th.h-desc { color: #F3AE00; border-color: #F3AE00; padding-left: 13.2pt; }
.cl .t-cot th.h-total { color: #4DB6AC; border-color: #4DB6AC; text-align: right; padding-right: 14pt; }
.cl .t-cot td { height: 28.4pt; padding: 7pt 0 0; }
.cl .t-cot td.desc { padding-left: 13.2pt; }
.cl .t-cot td.imp { text-align: right; padding-right: 10.4pt; font-weight: 700; }
.cl .t-cot tr.fila td { border-bottom: 0.75pt solid rgba(37,49,77,.4); }
.cl .t-cot tr.fila td.imp { border-left: 0.75pt solid rgba(37,49,77,.4); }
.cl .t-cot tr.totales td { border-top: 1.25pt solid #25314D; border-bottom: 0.75pt solid rgba(37,49,77,.4); }
.cl .t-cot tr.totales td + td { border-left: 0.75pt solid rgba(37,49,77,.4); }
.cl .t-cot tr.fila:nth-child(odd) td.desc { background: transparent; }
.cl .t-cot tr.fila:nth-child(even) td.desc { background: rgba(0,0,0,.024); }
.cl .t-cot tr.fila:nth-child(odd) td.imp { background: rgba(77,182,172,.07); }
.cl .t-cot tr.fila:nth-child(even) td.imp { background: rgba(77,182,172,.175); }
.cl .t-cot tr.totales td { font-weight: 700; background: rgba(77,182,172,.175); }
.cl .t-cot tr.totales td.l { padding-left: 13.2pt; }
.cl .t-cot tr.totales td.tt { background: rgba(40,220,140,.15); }

.cl .firmas { position: absolute; left: 67.7pt; top: 640pt; width: 480pt; display: flex; justify-content: space-between; }
.cl .firma { width: 200pt; text-align: center; }
.cl .firma .linea { border-top: 1pt solid #25314D; margin-bottom: 6pt; }
.cl .firma .nombre { font-size: 11pt; font-weight: 700; }
.cl .firma .rol { font-size: 9pt; margin-top: 2pt; }

.cl .t-gar { font-size: 11pt; }
.cl .t-gar thead tr { background: #F3AE00; }
.cl .t-gar th { text-align: left; font-weight: 400; }
.cl .t-gar thead th { height: 32.3pt; padding: 8.94pt 12pt 0; color: #fff; font-size: 12pt; }
.cl .t-gar tbody th { font-weight: 700; padding: 14pt 12pt 14pt; }
.cl .t-gar tbody td { padding: 14pt 12pt 14pt; }
.cl .t-gar tbody tr { height: 50pt; }
.cl .t-gar tbody tr:nth-child(even) { background: rgba(0,0,0,.133); }
.cl .nota-gar { position: absolute; left: 50.7pt; top: 568pt; width: 477.5pt; padding: 14pt 16pt; font-size: 10pt; background: rgba(77,182,172,.14); border-radius: 6pt; color: #25314D; }
.cl .nota-tit { font-size: 12pt; font-weight: 700; margin-bottom: 6pt; }
`;
