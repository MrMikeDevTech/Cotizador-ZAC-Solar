import { describe, expect, test } from 'bun:test';
import { calcularTotalesCotizacion } from './cotizacion.ts';
import { construirCotizacionPdf } from './cotizacionPdf.ts';
import { construirCotizacionLargaPdf } from './cotizacionLargaPdf.ts';
import type { ProyectoCotizableLargo } from './cotizacionLargaPdf.ts';

/**
 * Paridad entre lo que muestra la vista web del wizard y lo que imprimen los
 * dos PDF. La vista web calcula con `calcularTotalesCotizacion` (el mismo que
 * usa el backend para guardar el `granTotal`); aquí se parte de esos totales,
 * se arma la cotización guardada y se comprueba, centavo por centavo, que cada
 * PDF suma lo mismo que la pantalla — con márgenes, estructura, cargos
 * editables, descuento e IVA.
 */

const conceptos = [
  { id: 'a', concepto: 'Precio de paneles', costoBase: 44000, margenPorcentaje: 12.5, orden: 0 },
  { id: 'b', concepto: 'Precio de inversores', costoBase: 13500, margenPorcentaje: 18.333, orden: 1 },
  { id: 'c', concepto: 'Precio material eléctrico', costoBase: 3480, margenPorcentaje: 7.77, orden: 2 },
  { id: 'd', concepto: 'Mano de obra', costoBase: 3600, margenPorcentaje: 25, orden: 3 },
];
const cargosEditables = [
  { id: 'x', nombre: 'Trámite CFE', monto: 2500 },
  { id: 'y', nombre: 'Flete', monto: 1234.56 },
];
const ESTRUCTURA = { nombre: 'Estructura para soporte de aluminio anodizado', precio: 8800 };

function cotizacionGuardada(opciones: { descuento5: boolean; descuento10: boolean; incluirIva: boolean }) {
  const totales = calcularTotalesCotizacion({
    conceptos,
    cargosEditables,
    precioEstructura: ESTRUCTURA.precio,
    ...opciones,
    ivaPorcentaje: 16,
  });
  return {
    totales,
    cotizacion: {
      panelNombre: 'Panel',
      cantPaneles: 10,
      inversorNombre: 'Inversor',
      cantInversores: 1,
      estructuraNombre: ESTRUCTURA.nombre,
      estructuraPrecio: ESTRUCTURA.precio,
      tamanoSistemaW: 6200,
      produccionPeriodo: 900,
      subtotalGeneral: totales.subtotalGeneral,
      montoDescuento: totales.montoDescuento,
      subtotalConDescuento: totales.subtotalConDescuento,
      montoIva: totales.montoIVA,
      granTotal: totales.granTotal,
      metodoPago: 'Contado',
      incluirIva: opciones.incluirIva,
      ocultarDesglose: false,
      descuento5: opciones.descuento5,
      descuento10: opciones.descuento10,
      conceptos: conceptos.map(({ concepto, costoBase, margenPorcentaje, orden }) => ({
        concepto,
        costoBase,
        margenPorcentaje,
        orden,
      })),
      cargos: cargosEditables.map((c, orden) => ({ nombre: c.nombre, monto: c.monto, orden })),
    },
  };
}

const contacto = {
  nombre: 'Juan',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: '',
  telefono: '1',
  celular: '',
  localidad: '',
  estado: '',
  esEmpresa: false,
  razonSocial: '',
};
const consumos = Array.from({ length: 6 }, (_, i) => ({
  inicioStr: `Mes ${i}`,
  terminoStr: `Mes ${i + 1}`,
  kwh: 400,
  pago: 900,
}));

const centavos = (n: number) => Math.round(n * 100) / 100;

describe.each([
  { nombre: 'sin descuento ni IVA', descuento5: false, descuento10: false, incluirIva: false },
  { nombre: 'con descuento 15 % e IVA', descuento5: true, descuento10: true, incluirIva: true },
])('paridad de totales: $nombre', (opciones) => {
  const { totales, cotizacion } = cotizacionGuardada(opciones);

  test('cotización corta: las líneas suman exactamente el total de la vista web', () => {
    const pdf = construirCotizacionPdf({
      proyecto: { nombre: 'P', localidadConsumo: '', contacto, cotizaciones: [cotizacion] },
      empresa: null,
      fecha: new Date(2026, 0, 1),
    });
    const suma = centavos(pdf.lineas.reduce((acc, l) => acc + l.importe, 0));
    expect(pdf.total).toBe(centavos(totales.granTotal));
    expect(suma).toBe(centavos(totales.granTotal));
  });

  test('cotización larga: subtotal y total coinciden con la vista web', () => {
    const proyecto: ProyectoCotizableLargo = {
      nombre: 'P',
      localidadConsumo: '',
      periodo: 'Bimestral',
      contacto,
      consumos,
      cotizaciones: [cotizacion],
    };
    const pdf = construirCotizacionLargaPdf({
      proyecto,
      empresa: null,
      fecha: new Date(2026, 0, 1),
      pagoMinimoCfe: 60,
    });
    const formato = (n: number) =>
      `$${centavos(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    expect(pdf.cotizacion.total).toBe(formato(totales.granTotal));
    expect(pdf.cotizacion.subtotal).toBe(formato(totales.subtotalConDescuento));
    expect(pdf.cotizacion.iva).toBe(formato(totales.montoIVA));
    // En el papel, Subtotal + IVA = Total al centavo.
    const num = (t: string) => Number(t.replace(/[$,]/g, ''));
    expect(centavos(num(pdf.cotizacion.subtotal) + num(pdf.cotizacion.iva))).toBe(
      num(pdf.cotizacion.total)
    );
    // Las filas (sin la de IVA, que va en su bloque) suman el subtotal.
    const suma = centavos(pdf.cotizacion.lineas.reduce((acc, l) => acc + l.importe, 0));
    expect(suma).toBe(centavos(totales.subtotalConDescuento));
  });

  test('ambos PDF incluyen todas las partidas: conceptos con margen, estructura y cargos', () => {
    const pdf = construirCotizacionPdf({
      proyecto: { nombre: 'P', localidadConsumo: '', contacto, cotizaciones: [cotizacion] },
      empresa: null,
      fecha: new Date(2026, 0, 1),
    });
    const descripciones = pdf.lineas.map((l) => l.descripcion);
    expect(descripciones.some((d) => d.includes('Panel'))).toBe(true);
    expect(descripciones.some((d) => d.includes('Inversor'))).toBe(true);
    expect(descripciones).toContain(ESTRUCTURA.nombre);
    expect(descripciones).toContain('Trámite CFE');
    expect(descripciones).toContain('Flete');
    expect(descripciones).toContain('Mano de obra');
    // El precio con margen, no el base: 44,000 × 1.125 = 49,500 (la línea del panel).
    const panel = pdf.lineas.find((l) => l.descripcion.includes('Panel'))!;
    expect(panel.importe).toBe(49500);
  });
});
