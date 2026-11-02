import type { DatosCartaPoder } from '@cotizador/shared';

/**
 * Carta Poder ante CFE. Es la plantilla
 * `docs/referencia-carta-poder/carta_poder_cfe_plantilla.html` hecha componente:
 * mismo texto y mismos estilos (prefijo `cp-` para no afectar a otros
 * documentos), con los `{{marcadores}}` sustituidos por los datos confirmados.
 */

interface Props {
  datos: DatosCartaPoder;
  /** "Zacualpan, Nayarit, a 12 de Marzo del 2025". */
  lugarFecha: string;
}

const ESTILOS = `
  @page { size: letter; margin: 25mm 20mm; }
  .cp-hoja {
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    line-height: 1.55;
    color: #111;
    background: #fff;
  }
  .cp-hoja * { box-sizing: border-box; }
  .cp-hoja h1 { margin: 0 0 14mm; font-size: 16pt; letter-spacing: .12em; text-align: center; }
  .cp-lugar-fecha { margin: 0 0 10mm; text-align: right; }
  .cp-destinatario { margin: 0 0 8mm; font-weight: bold; text-transform: uppercase; }
  .cp-cuerpo { margin: 0 0 6mm; text-align: justify; hyphens: none; }
  .cp-despedida { margin: 8mm 0 0; }
  .cp-firmas {
    margin-top: 30mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 20mm;
    row-gap: 24mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .cp-firma { text-align: center; break-inside: avoid; }
  .cp-linea { height: 18mm; border-bottom: 1px solid #111; }
  .cp-nombre { margin-top: 2mm; font-weight: bold; font-size: 11pt; line-height: 1.3; text-transform: uppercase; }
  .cp-rol { margin-top: 1mm; font-size: 10.5pt; letter-spacing: .08em; text-transform: uppercase; }
  @media screen {
    .cp-hoja { width: 215.9mm; min-height: 279.4mm; margin: 16px auto; padding: 25mm 20mm; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  }
`;

export function DocumentoCartaPoder({ datos, lugarFecha }: Props) {
  return (
    <main className="cp-hoja">
      <style>{ESTILOS}</style>

      <h1>CARTA PODER</h1>

      <p className="cp-lugar-fecha">{lugarFecha}</p>

      <p className="cp-destinatario">CFE Suministrador de Servicios Básicos</p>

      <p className="cp-cuerpo">
        Por medio de este conducto otorgo poder amplio y suficiente al ciudadano{' '}
        <strong>{datos.nombreApoderado}</strong>, para que, a nombre de{' '}
        <strong>{datos.nombreCliente}</strong>, lleve a cabo la gestoría para el trámite de
        interconexión y contraprestación necesaria, para solicitar información y realizar los
        trámites ante CFE Suministrador de Servicios Básicos y, de ser necesario, pueda firmar los
        contratos en mi nombre. En el domicilio <strong>{datos.direccionCompleta}</strong>, con C.P.{' '}
        <strong>{datos.codigoPostal}</strong>, con No. de Servicio:{' '}
        <strong>{datos.numeroServicio}</strong> y de medidor <strong>{datos.numeroMedidor}</strong>.
      </p>

      <p className="cp-despedida">Sin más por el momento, quedo de usted.</p>

      <section className="cp-firmas">
        <div className="cp-firma">
          <div className="cp-linea" />
          <div className="cp-nombre">{datos.nombreApoderado}</div>
          <div className="cp-rol">Apoderado</div>
        </div>
        <div className="cp-firma">
          <div className="cp-linea" />
          <div className="cp-nombre">{datos.nombreCliente}</div>
          <div className="cp-rol">Otorgante</div>
        </div>
        <div className="cp-firma">
          <div className="cp-linea" />
          <div className="cp-rol">Testigo 1</div>
        </div>
        <div className="cp-firma">
          <div className="cp-linea" />
          <div className="cp-rol">Testigo 2</div>
        </div>
      </section>
    </main>
  );
}
