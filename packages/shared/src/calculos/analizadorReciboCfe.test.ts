import { describe, expect, test } from 'bun:test';
import { analizarReciboCfe, reciboReconocido, separarNombreTitular } from './analizadorReciboCfe.ts';

/**
 * Texto con la misma estructura que devuelve el OCR del recibo CFE real
 * (columna izquierda de la página 1 y tabla de la página 2), pero con datos
 * **ficticios**: el recibo de ejemplo del repositorio trae nombre y número de
 * servicio de una persona real y no debe copiarse a tests que se suben a git.
 */
const PAGINA_1 = `GARCIA LOPEZ ANA MARIA                yr
CALLE REFORMA 120
ESQUINA
TEPIC CENTROC.P.63000
TEPIC,NAY.
NO. DE SERVICIO:123456789012
RMU:63000 26-09-07 XAXX-010101 006 CFE
CUENTA:18DX13B270020266
LÍMITE DE PAGO:29 OCT 26
CORTE A PARTIR:30 OCT 26
TARIFA:1BNO. MEDIDOR:5GRR02
MULTIPLICADOR:1
NO HILOS:1
PERIODO FACTURADO:13 AGO 26-13 OCT 26`;

const PAGINA_2 = `del 12 JUN 26 al 13 AGO 26                  1741         $12,908.00        $12,908.00
del 13 ABR 26 al 12 JUN 26                  1584         $11,993.00        $11,993.00
del 12 FEB 26 al 13 ABR 26                  1320         $10,611.00        $10,611.00
del 15 DIC 25 al 12 FEB 26                   1252           $9,290.00          $9,290.00
del 14 OCT 25 al 15 DIC 25                     1491           $10,495.00         $10,495.00
del 14 AGO 25 al 14 OCT 25                  1494         $10,473.00        $10,473.00
del 13 JUN 25 al 14 AGO 25             1595       $11,531.00      $11,531.00
del 14 ABR 25 al 13 JUN 25             1409       $10,542.00      $10,542.00`;

const estandar = () => analizarReciboCfe([PAGINA_1, PAGINA_2]);

describe('analizarReciboCfe — recibo estándar', () => {
  test('extrae titular, servicio, tarifa, hilos y domicilio', () => {
    const { datos, advertencias } = estandar();
    expect(datos.nombreCliente).toBe('Garcia Lopez Ana Maria');
    expect(datos.numeroServicio).toBe('123456789012');
    expect(datos.tarifa).toBe('1B');
    expect(datos.hilos).toBe('1 hilo');
    expect(datos.localidad).toBe('Tepic');
    expect(datos.estado).toBe('Nayarit');
    expect(datos.codigoPostal).toBe('63000');
    expect(datos.municipio).toBe('Tepic Centro');
    expect(advertencias).toEqual([]);
  });

  test('el nombre del proyecto es "nombreCliente - localidad"', () => {
    expect(estandar().datos.nombreProyecto).toBe('Garcia Lopez Ana Maria - Tepic');
  });

  test('toma estrictamente los 6 periodos más recientes del histórico, en orden', () => {
    const { datos } = estandar();
    expect(datos.consumosHistoricos).toHaveLength(6);
    expect(datos.consumosHistoricos.map((c) => c.kwh)).toEqual([1741, 1584, 1320, 1252, 1491, 1494]);
    expect(datos.consumosHistoricos.map((c) => c.importe)).toEqual([
      12908, 11993, 10611, 9290, 10495, 10473,
    ]);
    expect(datos.consumosHistoricos[0]).toEqual({
      inicio: '2026-06-12',
      termino: '2026-08-13',
      kwh: 1741,
      importe: 12908,
    });
  });

  test('deduce el periodo bimestral y la fecha de inicio del periodo más reciente', () => {
    const { datos } = estandar();
    expect(datos.periodo).toBe('Bimestral');
    expect(datos.fechaInicio).toBe('2026-06-12');
  });

  test('lee el periodo facturado vigente', () => {
    expect(estandar().datos.periodoFacturado).toEqual({ inicio: '2026-08-13', termino: '2026-10-13' });
  });

  test('desglosa el titular como "APELLIDOS NOMBRE" (a revisar)', () => {
    expect(estandar().datos.contacto).toEqual({
      apellidoPaterno: 'Garcia',
      apellidoMaterno: 'Lopez',
      nombre: 'Ana Maria',
    });
  });

  test('el orden de las páginas no importa', () => {
    const invertido = analizarReciboCfe([PAGINA_2, PAGINA_1]);
    expect(invertido.datos).toEqual(estandar().datos);
  });

  test('si el mismo periodo se leyó en dos pasadas de OCR no se duplica', () => {
    const { datos } = analizarReciboCfe([PAGINA_1, PAGINA_2, PAGINA_2]);
    expect(datos.consumosHistoricos).toHaveLength(6);
  });
});

describe('analizarReciboCfe — medidor y dirección', () => {
  test('lee el medidor pegado a la tarifa y arma la dirección sin el C.P.', () => {
    const { datos } = analizarReciboCfe([PAGINA_1, PAGINA_2]);
    expect(datos.numeroMedidor).toBe('5GRR02');
    expect(datos.codigoPostal).toBe('63000');
    expect(datos.direccion).toBe('Calle Reforma 120, Esquina, Tepic Centro, Nayarit');
  });

  test('el medidor se corta antes del multiplicador', () => {
    const { datos } = analizarReciboCfe([
      PAGINA_1.replace('TARIFA:1BNO. MEDIDOR:5GRR02', 'TARIFA:1BNO. MEDIDOR:AB12CDMULTIPLICADOR:1'),
      PAGINA_2,
    ]);
    expect(datos.numeroMedidor).toBe('AB12CD');
  });

  test('sin etiqueta de medidor queda vacío, sin inventar nada', () => {
    const { datos } = analizarReciboCfe([PAGINA_1.replace('NO. MEDIDOR:5GRR02', ''), PAGINA_2]);
    expect(datos.numeroMedidor).toBe('');
  });
});

describe('analizarReciboCfe — tarifa', () => {
  const conTarifa = (linea: string) =>
    analizarReciboCfe([PAGINA_1.replace('TARIFA:1BNO. MEDIDOR:5GRR02', linea), PAGINA_2]);

  test.each([
    ['TARIFA:1BNO. MEDIDOR:5GRR02', '1B'],
    ['TARIFA:1B NO. MEDIDOR:5GRR02', '1B'],
    ['TARIFA:DACNO. MEDIDOR:5GRR02', 'DAC'],
    ['TARIFA:PDBTMULTIPLICADOR:1', 'PDBT'],
    ['TARIFA:01NO. MEDIDOR:AB12', '1'],
    ['TARIFA: 1A   NO. MEDIDOR:AB12', '1A'],
  ])('%s → %s', (linea, esperada) => {
    const { datos, advertencias } = conTarifa(linea);
    expect(datos.tarifa).toBe(esperada);
    expect(advertencias).toEqual([]);
  });

  test('un carácter de más del OCR ("15B") se corrige a "1B" y se avisa', () => {
    const { datos, advertencias } = conTarifa('TARIFA:15BNO. MEDIDOR:5GRRO2');
    expect(datos.tarifa).toBe('1B');
    expect(advertencias.some((a) => a.includes('15B') && a.includes('1B'))).toBe(true);
  });

  test('una tarifa fuera del catálogo se conserva y se avisa', () => {
    const { datos, advertencias } = conTarifa('TARIFA:GDBTNO. MEDIDOR:5GRR02');
    expect(datos.tarifa).toBe('GDBT');
    expect(advertencias.some((a) => a.includes('GDBT') && a.includes('catálogo'))).toBe(true);
  });
});

describe('analizarReciboCfe — hilos y servicio', () => {
  test.each([
    ['NO HILOS:2', '2 hilos' as const],
    ['NO. HILOS:3', '3 hilos' as const],
    ['NO. HILOS: 1', '1 hilo' as const],
  ])('%s', (linea, esperado) => {
    const { datos } = analizarReciboCfe([PAGINA_1.replace('NO HILOS:1', linea), PAGINA_2]);
    expect(datos.hilos).toBe(esperado);
  });

  test('el OCR confunde O/I/l con 0/1 dentro del número de servicio', () => {
    const { datos } = analizarReciboCfe([
      PAGINA_1.replace('123456789012', '4959303OO372'),
      PAGINA_2,
    ]);
    expect(datos.numeroServicio).toBe('495930300372');
  });

  test('un número de servicio con menos de 12 dígitos se avisa', () => {
    const { datos, advertencias } = analizarReciboCfe([
      PAGINA_1.replace('NO. DE SERVICIO:123456789012', 'NO. DE SERVICIO:12345678901'),
      PAGINA_2,
    ]);
    expect(datos.numeroServicio).toBe('12345678901');
    expect(advertencias.some((a) => a.includes('12 dígitos'))).toBe(true);
  });
});

describe('analizarReciboCfe — domicilio', () => {
  const conDomicilio = (linea: string) =>
    analizarReciboCfe([PAGINA_1.replace('TEPIC,NAY.', linea), PAGINA_2]).datos;

  test.each([
    ['ZAPOPAN,JAL.', 'Zapopan', 'Jalisco'],
    ['MONTERREY, N.L.', 'Monterrey', 'Nuevo León'],
    ['SAN LUIS POTOSI,S.L.P.', 'San Luis Potosi', 'San Luis Potosí'],
    ['CANCUN,Q. ROO', 'Cancun', 'Quintana Roo'],
    ['TOLUCA,MEX.', 'Toluca', 'Estado de México'],
  ])('%s', (linea, localidad, estado) => {
    const datos = conDomicilio(linea);
    expect(datos.localidad).toBe(localidad);
    expect(datos.estado).toBe(estado);
  });

  test('un estado desconocido deja el estado vacío y avisa, sin inventarlo', () => {
    const { datos, advertencias } = analizarReciboCfe([
      PAGINA_1.replace('TEPIC,NAY.', 'TEPIC,XYZ.'),
      PAGINA_2,
    ]);
    expect(datos.estado).toBe('');
    expect(datos.localidad).toBe('Tepic');
    expect(advertencias.some((a) => a.includes('XYZ'))).toBe(true);
  });

  test('corrige una letra mal impresa en el municipio usando la localidad ("SXTAPA" → "Ixtapa")', () => {
    const { datos } = analizarReciboCfe([
      PAGINA_1.replace('TEPIC CENTROC.P.63000', 'SXTAPA LA CONCEPCIONC.P.48280').replace(
        'TEPIC,NAY.',
        'IXTAPA,NAY.'
      ),
      PAGINA_2,
    ]);
    expect(datos.municipio).toBe('Ixtapa la Concepcion');
    expect(datos.codigoPostal).toBe('48280');
    expect(datos.localidad).toBe('Ixtapa');
  });

  test('con el texto completo de la página (encabezado CFE e importes) sigue hallando al titular', () => {
    const completa = `Comisión Federal de Electricidad
Av. Paseo de la Reforma 164, Col. Juárez,
Alcaldía: Cuauhtémoc, Código Postal: 06600,
Ciudad de México. RFC: CFE370814QI0
${PAGINA_1.replace('yr', '$4,868')}`;
    const { datos } = analizarReciboCfe([completa, PAGINA_2]);
    expect(datos.nombreCliente).toBe('Garcia Lopez Ana Maria');
    expect(datos.localidad).toBe('Tepic');
  });
});

describe('analizarReciboCfe — histórico', () => {
  test('menos de 6 periodos: avisa cuántos se leyeron', () => {
    const tres = PAGINA_2.split('\n').slice(0, 3).join('\n');
    const { datos, advertencias } = analizarReciboCfe([PAGINA_1, tres]);
    expect(datos.consumosHistoricos).toHaveLength(3);
    expect(advertencias.some((a) => a.includes('3 de 6'))).toBe(true);
  });

  test('recibo mensual: periodos de ~30 días', () => {
    const mensual = `del 13 SEP 26 al 13 OCT 26   310   $900.00   $900.00
del 13 AGO 26 al 13 SEP 26   295   $850.00   $850.00
del 13 JUL 26 al 13 AGO 26   301   $870.00   $870.00`;
    const { datos } = analizarReciboCfe([PAGINA_1, mensual]);
    expect(datos.periodo).toBe('Mensual');
    expect(datos.fechaInicio).toBe('2026-09-13');
  });

  test('tolera fechas pegadas y "S" en lugar de "$" (errores típicos del OCR)', () => {
    const sucio = `del 15DIC 25 al 12 FEB 26   1252   S9,290.00   S9,290.00
del 14 OCT25 al 15 DIC 25   1491   $10,495.00   $10,495.00`;
    const { datos } = analizarReciboCfe([PAGINA_1, sucio]);
    expect(datos.consumosHistoricos.map((c) => [c.inicio, c.kwh, c.importe])).toEqual([
      ['2025-12-15', 1252, 9290],
      ['2025-10-14', 1491, 10495],
    ]);
  });

  test('importe y pagos distintos se avisan; periodos no continuos también', () => {
    const roto = `del 12 JUN 26 al 13 AGO 26   1741   $12,908.00   $12,000.00
del 01 ENE 26 al 12 FEB 26   1584   $11,993.00   $11,993.00`;
    const { advertencias } = analizarReciboCfe([PAGINA_1, roto]);
    expect(advertencias.some((a) => a.includes('no coinciden'))).toBe(true);
    expect(advertencias.some((a) => a.includes('no son continuos'))).toBe(true);
  });
});

describe('analizarReciboCfe — texto sin recibo', () => {
  test('texto ilegible: no inventa nada y no se reconoce como recibo', () => {
    const { datos, advertencias } = analizarReciboCfe(['8:29:7#1:8!69\n"B6"CI,56 2I")']);
    expect(datos.numeroServicio).toBe('');
    expect(datos.tarifa).toBe('');
    expect(datos.hilos).toBe('');
    expect(datos.consumosHistoricos).toEqual([]);
    expect(datos.periodo).toBeNull();
    expect(datos.fechaInicio).toBe('');
    expect(reciboReconocido(datos)).toBe(false);
    expect(advertencias.length).toBeGreaterThan(0);
  });

  test('un recibo con servicio de 12 dígitos sí se reconoce', () => {
    expect(reciboReconocido(estandar().datos)).toBe(true);
  });
});

describe('separarNombreTitular', () => {
  test.each([
    ['MORENO ALVARADO MARTIN', { apellidoPaterno: 'MORENO', apellidoMaterno: 'ALVARADO', nombre: 'MARTIN' }],
    ['PEREZ JUAN', { apellidoPaterno: 'PEREZ', apellidoMaterno: '', nombre: 'JUAN' }],
    ['LOPEZ RUIZ MARIA FERNANDA', { apellidoPaterno: 'LOPEZ', apellidoMaterno: 'RUIZ', nombre: 'MARIA FERNANDA' }],
    ['EMPRESA', { apellidoPaterno: '', apellidoMaterno: '', nombre: 'EMPRESA' }],
    ['', { apellidoPaterno: '', apellidoMaterno: '', nombre: '' }],
  ])('%s', (entrada, esperado) => {
    expect(separarNombreTitular(entrada)).toEqual(esperado);
  });
});
