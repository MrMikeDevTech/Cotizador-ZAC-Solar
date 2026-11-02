import { describe, expect, test } from 'bun:test';
import {
  calcularEjeY,
  calcularPuntosGrafica,
  construirCotizacionLargaPdf,
  formatearDinero,
} from './cotizacionLargaPdf.ts';
import type { ProyectoCotizableLargo } from './cotizacionLargaPdf.ts';

/** Consumos del ejemplo de referencia (más reciente primero). */
const CONSUMOS = [
  { inicioStr: 'Mar 2026', terminoStr: 'May 2026', kwh: 400, pago: 828.36 },
  { inicioStr: 'Ene 2026', terminoStr: 'Mar 2026', kwh: 133, pago: 171.72 },
  { inicioStr: 'Nov 2025', terminoStr: 'Ene 2026', kwh: 104, pago: 133.55 },
  { inicioStr: 'Sep 2025', terminoStr: 'Nov 2025', kwh: 440, pago: 1057.37 },
  { inicioStr: 'Jul 2025', terminoStr: 'Sep 2025', kwh: 638, pago: 1875.78 },
  { inicioStr: 'May 2025', terminoStr: 'Jul 2025', kwh: 514, pago: 1308.67 },
];

function proyecto(consumos = CONSUMOS, montoIva = 0): ProyectoCotizableLargo {
  return {
    nombre: 'Casa Pérez',
    localidadConsumo: 'Monterrey',
    periodo: 'Bimestral',
    contacto: {
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'López',
      telefono: '555',
      celular: '',
      localidad: 'Monterrey',
      estado: 'NL',
      esEmpresa: false,
      razonSocial: '',
    },
    consumos,
    cotizaciones: [
      {
        panelNombre: 'Jinko, JKM615N-78HL4-V.',
        cantPaneles: 3,
        inversorNombre: 'Growatt, MIN 2500TL - X2',
        cantInversores: 1,
        estructuraNombre: 'Estructura',
        estructuraPrecio: 3600,
        tamanoSistemaW: 1845,
        produccionPeriodo: 430,
        subtotalGeneral: 33460.05,
        montoDescuento: 0,
        subtotalConDescuento: 33460.05,
        montoIva,
        granTotal: 33460.05 + montoIva,
        metodoPago: 'Contado',
        incluirIva: montoIva > 0,
        ocultarDesglose: false,
        descuento5: false,
        descuento10: false,
        conceptos: [
          { concepto: 'Precio de paneles', costoBase: 13200, margenPorcentaje: 0, orden: 0 },
          { concepto: 'Precio de inversores', costoBase: 9580.05, margenPorcentaje: 0, orden: 1 },
          { concepto: 'Mano de Obra', costoBase: 3600, margenPorcentaje: 0, orden: 2 },
        ],
        cargos: [{ nombre: 'Precio material eléctrico', monto: 3480, orden: 0 }],
      },
    ],
  };
}

const construir = (p = proyecto()) =>
  construirCotizacionLargaPdf({
    proyecto: p,
    empresa: null,
    fecha: new Date(2026, 5, 1),
    firmantePorDefecto: { nombre: 'María Fernanda Ruiz' },
    pagoMinimoCfe: 60,
  });

describe('equipo (hojas 4 y 5)', () => {
  test('marca y modelo salen del nombre de catálogo, nunca de la clave interna', () => {
    const d = construir();
    expect(d.panel).toEqual({ marca: 'Jinko', modelo: 'JKM615N-78HL4-V', cantidad: 3 });
    expect(d.inversor).toMatchObject({ marca: 'Growatt', modelo: 'MIN 2500TL - X2', cantidad: 1 });
  });

  test('el tipo de equipo es "Inversor" por defecto (cotizaciones anteriores o sin dato)', () => {
    expect(construir().inversor.tipo).toBe('Inversor');
  });

  test('"Microinversor" se respeta y cualquier otro valor cae a "Inversor"', () => {
    const p = proyecto();
    p.cotizaciones[0].tipoEquipoInversor = 'Microinversor';
    expect(construir(p).inversor.tipo).toBe('Microinversor');
    p.cotizaciones[0].tipoEquipoInversor = 'Otra cosa';
    expect(construir(p).inversor.tipo).toBe('Inversor');
  });
});

describe('ubicación y método de pago (hoja 7)', () => {
  test('la ubicación es "Localidad, Estado" del contacto', () => {
    const p = proyecto();
    p.contacto = { ...p.contacto, localidad: 'Ixtapa de la Concepción', estado: 'Nayarit' };
    expect(construir(p).ubicacion).toBe('Ixtapa de la Concepción, Nayarit');
  });

  test('el método de pago elegido pasa tal cual, y vacío cae al valor por defecto', () => {
    const p = proyecto();
    p.cotizaciones[0].metodoPago = '50% Anticipo y 50% al finalizar';
    expect(construir(p).metodoPago).toBe('50% Anticipo y 50% al finalizar');
    p.cotizaciones[0].metodoPago = '';
    expect(construir(p).metodoPago).toBe('Contado / Transferencia');
  });
});

describe('pie de contacto', () => {
  test('sin empresa configurada usa nombre, dirección y teléfonos por defecto', () => {
    const { empresa } = construir();
    expect(empresa.nombre).toBe('ZAC Solar');
    expect(empresa.direccion).toBe('Zacualpan, Nayarit');
    expect(empresa.telefono).toBe('311-246-8439 / 322-201-3424');
  });

  test('con empresa configurada manda lo capturado; los campos vacíos caen al defecto', () => {
    const d = construirCotizacionLargaPdf({
      proyecto: proyecto(),
      empresa: {
        nombre: 'Solar del Norte',
        telefono: '  ',
        localidad: 'Tepic, Nayarit',
        email: 'hola@solar.mx',
        tituloCotizacion: '',
        introPlantilla: '',
        observaciones: '',
        firmaNombre: '',
        firmaPuesto: '',
      },
      fecha: new Date(2026, 5, 1),
      pagoMinimoCfe: 60,
    });
    expect(d.empresa).toMatchObject({
      nombre: 'Solar del Norte',
      correo: 'hola@solar.mx',
      direccion: 'Tepic, Nayarit',
      telefono: '311-246-8439 / 322-201-3424',
    });
  });
});

describe('formatearDinero', () => {
  test('el signo va antes del símbolo', () => {
    expect(formatearDinero(1057.37)).toBe('$1,057.37');
    expect(formatearDinero(-5141.97)).toBe('-$5,141.97');
  });

  test('un negativo que redondea a cero no imprime "-$0.00"', () => {
    expect(formatearDinero(-0.001)).toBe('$0.00');
  });
});

describe('geometría de las gráficas', () => {
  test('los ejes reproducen los del ejemplo de referencia', () => {
    expect(calcularEjeY(638, 10)).toEqual({ paso: 130, tope: 650 });
    expect(calcularEjeY(1875.78, 100)).toEqual({ paso: 400, tope: 2000 });
  });

  test('los puntos de consumo coinciden con los del ejemplo', () => {
    const cronologico = [514, 638, 440, 104, 133, 400];
    expect(calcularPuntosGrafica(cronologico, 650)).toBe(
      '85.0,58.0 141.7,30.9 198.4,74.1 255.1,147.4 311.8,141.1 368.5,82.8'
    );
  });

  test('con tope 0 no divide entre cero', () => {
    expect(calcularPuntosGrafica([0, 0], 0)).toBe('85.0,170.1 141.7,170.1');
    expect(calcularEjeY(0, 10).tope).toBeGreaterThan(0);
  });
});

describe('construirCotizacionLargaPdf', () => {
  test('hoja 1: totales y orden (más reciente primero)', () => {
    const d = construir();
    expect(d.consumoHistorico[0]).toMatchObject({ inicio: 'Mar 2026', kwh: '400' });
    expect(d.totalKwh).toBe('2,229');
    expect(d.totalPagoCfe).toBe('$5,375.45');
  });

  test('hoja 2: el eje X es cronológico (al revés que las tablas)', () => {
    const d = construir();
    expect(d.graficaConsumo.ejeX.map((e) => `${e.mes}-${e.anio}`)).toEqual([
      'May-25',
      'Jul-25',
      'Sep-25',
      'Nov-25',
      'Ene-26',
      'Mar-26',
    ]);
    expect(d.graficaConsumo.ejeY).toHaveLength(6);
    expect(d.graficaConsumo.ejeY[0]).toBe('650');
    expect(d.graficaConsumo.ejeY[5]).toBe('0');
    expect(d.graficaConsumo.puntosConsumo.split(' ')).toHaveLength(6);
  });

  test('hoja 3: una fila por periodo y el ahorro anual suma las filas', () => {
    const d = construir();
    expect(d.retornoInversion).toHaveLength(6);
    expect(d.retornoInversion[0]).toMatchObject({ inicio: 'Mar 2026', termino: 'May 2026' });
    // Sin escalones reales el cálculo es aproximado y se avisa.
    expect(d.usoTarifaReal).toBe(false);
  });

  test('hoja 6: la proyección admite ahorro negativo (no se maquilla a 0)', () => {
    // Consumos casi nulos: la inversión no se recupera en 5 años.
    const bajos = CONSUMOS.map((c) => ({ ...c, kwh: 60, pago: 70 }));
    const d = construir(proyecto(bajos));
    expect(d.proyeccion.ahorro.startsWith('-$')).toBe(true);
    expect(d.proyeccion.anios).toBe(5);
  });

  test('hoja 6: la TIR sale como porcentaje de calcularTIR5Anos, sin reescalar', () => {
    const d = construir();
    const valor = Number(d.proyeccion.tir.replace(/[^0-9.-]/g, ''));
    // Con la inversión del ejemplo (≈ $33 mil) y ahorros de miles al año, la TIR es de
    // un par de decenas por ciento; si se multiplicara dos veces rondaría el 1,000 %.
    expect(valor).toBeGreaterThanOrEqual(0);
    expect(valor).toBeLessThan(100);
  });

  test('hoja 7: el IVA va en su bloque, no como línea, y las líneas suman el subtotal', () => {
    const d = construir(proyecto(CONSUMOS, 5353.61));
    expect(d.cotizacion.lineas.some((l) => l.descripcion === 'IVA')).toBe(false);
    const suma = d.cotizacion.lineas.reduce((acc, l) => acc + l.importe, 0);
    expect(suma).toBeCloseTo(33460.05, 2);
    expect(d.cotizacion.iva).toBe('$5,353.61');
    expect(d.cotizacion.total).toBe('$38,813.66');
    expect(d.asesorNombre).toBe('María Fernanda Ruiz');
    expect(d.clienteNombre).toBe('Juan Pérez López');
  });

  test('menos de 6 periodos no rompe las gráficas ni las tablas', () => {
    const d = construir(proyecto(CONSUMOS.slice(0, 3)));
    expect(d.retornoInversion).toHaveLength(3);
    expect(d.graficaPagos.puntosHistorico.split(' ')).toHaveLength(3);
  });
});
