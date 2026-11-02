import { describe, expect, test } from 'bun:test';
import type { ResultadoReciboCfe } from '@cotizador/shared';
import { construirAutocompletado } from './autocompletarRecibo.ts';

const CATALOGO = [
  { estado: 'Nayarit', nombre: 'Compostela' },
  { estado: 'Nayarit', nombre: 'Tepic' },
  { estado: 'Jalisco', nombre: 'Zapopan' },
];

/** Recibo ficticio con la misma forma que devuelve el backend. */
function recibo(cambios: Partial<ResultadoReciboCfe['datos']> = {}): ResultadoReciboCfe {
  return {
    origenTexto: 'ocr',
    advertencias: [],
    datos: {
      nombreCliente: 'Garcia Lopez Ana Maria',
      nombreProyecto: 'Garcia Lopez Ana Maria - Tepic',
      contacto: { apellidoPaterno: 'Garcia', apellidoMaterno: 'Lopez', nombre: 'Ana Maria' },
      numeroServicio: '123456789012',
      tarifa: '1B',
      hilos: '1 hilo',
      localidad: 'Tepic',
      municipio: 'Tepic Centro',
      estado: 'Nayarit',
      codigoPostal: '63000',
      numeroMedidor: '5GRR02',
      direccion: 'Calle Reforma 120, Tepic Centro, Nayarit',
      periodoFacturado: { inicio: '2026-08-13', termino: '2026-10-13' },
      periodo: 'Bimestral',
      fechaInicio: '2026-06-12',
      consumosHistoricos: [
        { inicio: '2026-06-12', termino: '2026-08-13', kwh: 1741, importe: 12908 },
        { inicio: '2026-04-13', termino: '2026-06-12', kwh: 1584, importe: 11993.5 },
      ],
      ...cambios,
    },
  };
}

describe('construirAutocompletado', () => {
  test('Paso 1: nombre, apellidos, estado y localidad; quita el contacto existente', () => {
    const { contacto } = construirAutocompletado(recibo(), CATALOGO);
    expect(contacto).toEqual({
      contactoExistenteId: undefined,
      nombre: 'Ana Maria',
      apellidoPaterno: 'Garcia',
      apellidoMaterno: 'Lopez',
      estado: 'Nayarit',
      localidad: 'Tepic',
    });
    // La clave existe (aunque valga undefined) para que el merge la borre del estado.
    expect('contactoExistenteId' in contacto).toBe(true);
  });

  test('no pisa teléfono, correo ni notas: no vienen en el parche', () => {
    const { contacto } = construirAutocompletado(recibo(), CATALOGO);
    for (const campo of ['telefono', 'celular', 'email', 'notas', 'empresariales']) {
      expect(campo in contacto).toBe(false);
    }
  });

  test('campos vacíos del recibo no sobrescriben lo ya capturado', () => {
    const { contacto } = construirAutocompletado(
      recibo({ estado: '', localidad: '', contacto: { nombre: '', apellidoPaterno: '', apellidoMaterno: '' } }),
      CATALOGO
    );
    expect(Object.keys(contacto)).toEqual(['contactoExistenteId']);
  });

  test('conserva código postal, medidor y dirección para la Carta Poder', () => {
    const plan = construirAutocompletado(recibo(), CATALOGO);
    expect(plan.codigoPostal).toBe('63000');
    expect(plan.numeroMedidor).toBe('5GRR02');
    expect(plan.direccion).toBe('Calle Reforma 120, Tepic Centro, Nayarit');
  });

  test('Paso 2: proyecto, recibo, servicio, hilos y periodo', () => {
    const plan = construirAutocompletado(recibo(), CATALOGO);
    expect(plan.nombreProyecto).toBe('Garcia Lopez Ana Maria - Tepic');
    expect(plan.nombreRecibo).toBe('Garcia Lopez Ana Maria');
    expect(plan.numeroServicio).toBe('123456789012');
    expect(plan.hilos).toBe('1 hilo');
    expect(plan.periodo).toBe('Bimestral');
  });

  test('fecha de inicio ISO y en texto DD/MM/AAAA', () => {
    const plan = construirAutocompletado(recibo(), CATALOGO);
    expect(plan.fechaInicio).toBe('2026-06-12');
    expect(plan.fechaTexto).toBe('12/06/2026');
  });

  test('consumos como texto: kWh entero e importe con dos decimales', () => {
    const { consumos } = construirAutocompletado(recibo(), CATALOGO);
    expect(consumos).toEqual([
      { kwh: '1741', pago: '12908.00' },
      { kwh: '1584', pago: '11993.50' },
    ]);
  });

  test.each([
    ['1B', false],
    ['DAC', false],
    ['PDBT', true],
    ['APBT', true],
  ])('tarifa %s: checkbox de tarifa nueva = %s', (tarifa, nueva) => {
    const plan = construirAutocompletado(recibo({ tarifa }), CATALOGO);
    expect(plan.tarifa).toBe(tarifa);
    expect(plan.usarNuevaTarifa).toBe(nueva);
  });

  test('una tarifa fuera del catálogo no se asigna y se avisa', () => {
    const plan = construirAutocompletado(recibo({ tarifa: 'GDBT' }), CATALOGO);
    expect(plan.tarifa).toBeNull();
    expect(plan.usarNuevaTarifa).toBeNull();
    expect(plan.avisos.some((a) => a.includes('GDBT'))).toBe(true);
  });

  test('localidad de consumo con el nombre exacto del catálogo', () => {
    expect(construirAutocompletado(recibo(), CATALOGO).localidadConsumo).toBe('Nayarit - Tepic');
  });

  test('un municipio ausente del catálogo no se inventa: queda null y se avisa', () => {
    const plan = construirAutocompletado(
      recibo({ localidad: 'Ixtapa', municipio: 'Ixtapa la Concepcion' }),
      CATALOGO
    );
    expect(plan.localidadConsumo).toBeNull();
    expect(plan.avisos.some((a) => a.includes('Ixtapa la Concepcion') && a.includes('catálogo'))).toBe(true);
  });

  test('sin estado reconocido se avisa y no se asigna localidad', () => {
    const plan = construirAutocompletado(recibo({ estado: '' }), CATALOGO);
    expect(plan.localidadConsumo).toBeNull();
    expect(plan.avisos.some((a) => a.includes('estado'))).toBe(true);
  });

  test('menos de 6 periodos o ninguno se avisa', () => {
    expect(construirAutocompletado(recibo(), CATALOGO).avisos.some((a) => a.includes('2 de 6'))).toBe(true);
    const sinHistorico = construirAutocompletado(
      recibo({ consumosHistoricos: [], fechaInicio: '', periodo: null }),
      CATALOGO
    );
    expect(sinHistorico.consumos).toEqual([]);
    expect(sinHistorico.fechaInicio).toBeNull();
    expect(sinHistorico.fechaTexto).toBeNull();
    expect(sinHistorico.avisos.some((a) => a.includes('histórico'))).toBe(true);
  });

  test('siempre recuerda revisar el nombre separado en apellidos', () => {
    expect(construirAutocompletado(recibo(), CATALOGO).avisos.some((a) => a.includes('apellidos'))).toBe(true);
  });
});
