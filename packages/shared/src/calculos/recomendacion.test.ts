import { describe, expect, test } from 'bun:test';
import { recomendarPaquetes } from './recomendacion.ts';
import { calcularTotalesCotizacion } from './cotizacion.ts';
import type { ConceptoCotizacion } from '../types/dominio.ts';
import type { EntradaRecomendacion, PerfilPaquete } from './recomendacion.ts';
import { calcularDimensionamiento, calcularPromedios } from './dimensionamiento.ts';
import { PANELES_INICIALES, INVERSORES_INICIALES, FACTORES_CALCULO_DEFECTO } from '../seed/catalogosIniciales.ts';
import type { PanelData, InversorData } from '../types/configuracion.ts';
import type { ConsumoPeriodo } from '../types/dominio.ts';

// Mismo fixture real que dimensionamiento.test.ts (contacto YARELI RAMIREZ SANTIAGO).
const consumosFixture: ConsumoPeriodo[] = [
  { inicioStr: 'marzo 2026', terminoStr: 'mayo 2026', kwh: '786', pago: '2110.43' },
  { inicioStr: 'enero 2026', terminoStr: 'marzo 2026', kwh: '582', pago: '1572.20' },
  { inicioStr: 'noviembre 2025', terminoStr: 'enero 2026', kwh: '668', pago: '1955.10' },
  { inicioStr: 'septiembre 2025', terminoStr: 'noviembre 2025', kwh: '896', pago: '2972.96' },
  { inicioStr: 'julio 2025', terminoStr: 'septiembre 2025', kwh: '975', pago: '2903.51' },
  { inicioStr: 'mayo 2025', terminoStr: 'julio 2025', kwh: '861', pago: '2373.56' },
];

const { consumoPromedioKwh, pagoPromedioCFE } = calcularPromedios(consumosFixture);
// ~794.6667 kWh / ~2314.6267 $ por periodo.

const FACTORES = {
  factorProduccion: FACTORES_CALCULO_DEFECTO.factorProduccion,
  pagoMinimoCfe: FACTORES_CALCULO_DEFECTO.pagoMinimoCfe,
};

function entradaBase(overrides: Partial<EntradaRecomendacion> = {}): EntradaRecomendacion {
  return {
    paneles: PANELES_INICIALES,
    inversores: INVERSORES_INICIALES,
    consumoPromedioKwh,
    pagoPromedioCFE,
    factores: FACTORES,
    ...overrides,
  };
}

function unionPerfiles(paquetes: { perfiles: PerfilPaquete[] }[]): PerfilPaquete[] {
  return paquetes.flatMap((p) => p.perfiles);
}

describe('recomendarPaquetes - casos límite', () => {
  test('SIN_PANELES cuando el catálogo de paneles está vacío', () => {
    const resultado = recomendarPaquetes(entradaBase({ paneles: [] }));
    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('SIN_PANELES');
  });

  test('SIN_PANELES cuando ningún panel está activo', () => {
    const inactivos = PANELES_INICIALES.map((p) => ({ ...p, activo: false }));
    const resultado = recomendarPaquetes(entradaBase({ paneles: inactivos }));
    expect(resultado.advertencias).toContain('SIN_PANELES');
  });

  test('SIN_INVERSORES cuando el catálogo de inversores está vacío', () => {
    const resultado = recomendarPaquetes(entradaBase({ inversores: [] }));
    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('SIN_INVERSORES');
  });

  test('SIN_INVERSORES cuando ningún inversor está activo', () => {
    const inactivos = INVERSORES_INICIALES.map((i) => ({ ...i, activo: false }));
    const resultado = recomendarPaquetes(entradaBase({ inversores: inactivos }));
    expect(resultado.advertencias).toContain('SIN_INVERSORES');
  });

  test('SIN_CONSUMO cuando consumoPromedioKwh <= 1 (centinela de calcularPromedios)', () => {
    // calcularPromedios devuelve 1 cuando no hay captura (sumaKwh/6 || 1); por
    // eso el piso de esta validación es <= 1, no <= 0.
    const resultado = recomendarPaquetes(entradaBase({ consumoPromedioKwh: 1 }));
    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('SIN_CONSUMO');
  });

  test('FACTORES_INVALIDOS cuando factorProduccion <= 0', () => {
    const resultado = recomendarPaquetes(
      entradaBase({ factores: { ...FACTORES, factorProduccion: 0 } })
    );
    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('FACTORES_INVALIDOS');
  });

  test('SIN_PAGO_CAPTURADO: pago 0 con consumo > 0 sí produce paquetes, pero ahorro clamp a 0 y retorno null', () => {
    const resultado = recomendarPaquetes(entradaBase({ pagoPromedioCFE: 0 }));
    expect(resultado.paquetes.length).toBeGreaterThan(0);
    expect(resultado.advertencias).toContain('SIN_PAGO_CAPTURADO');
    for (const paquete of resultado.paquetes) {
      expect(paquete.ahorroPorPeriodo).toBeGreaterThanOrEqual(0);
      expect(paquete.ahorroAnual).toBeGreaterThanOrEqual(0);
      expect(paquete.retornoAnios).toBeNull();
      expect(paquete.advertencias).toContain('SIN_PAGO_CAPTURADO');
    }
  });

  test('SIN_INVERSOR_VIABLE cuando ningún inversor alcanza ni con maxInversoresIguales', () => {
    const inversorMinusculo: InversorData[] = [
      { clave: 'mini', nombre: 'Mini', wattsMax: 1, precioUnitario: 100, activo: true, orden: 0 },
    ];
    const resultado = recomendarPaquetes(
      entradaBase({ inversores: inversorMinusculo, limites: { maxInversoresIguales: 1 } })
    );
    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('SIN_INVERSOR_VIABLE');
  });

  test('CONSUMO_MENOR_QUE_UN_PANEL cuando el panel más pequeño ya se pasa del tope', () => {
    // 20 kWh/bimestre contra un panel que produce ~152: ni uno solo cabe bajo
    // el 100 %. No es culpa del inversor, así que no debe reportarse como tal:
    // enviaría al vendedor a revisar el catálogo equivocado.
    const resultado = recomendarPaquetes(entradaBase({ consumoPromedioKwh: 20 }));

    expect(resultado.paquetes).toEqual([]);
    expect(resultado.advertencias).toContain('CONSUMO_MENOR_QUE_UN_PANEL');
    expect(resultado.advertencias).not.toContain('SIN_INVERSOR_VIABLE');
  });

  test('COBERTURA_MAXIMA_NO_ALCANZABLE si ni el arreglo máximo llega al tope', () => {
    const resultado = recomendarPaquetes(
      entradaBase({ limites: { maxPanelesArreglo: 1, coberturaMinimaPct: 0 } })
    );
    expect(resultado.advertencias).toContain('COBERTURA_MAXIMA_NO_ALCANZABLE');
    expect(resultado.paquetes.length).toBeGreaterThan(0);
  });

  test('COBERTURA_BAJO_MINIMO: fallback devuelve el mejor candidato existente, no lista vacía', () => {
    const resultado = recomendarPaquetes(
      entradaBase({ limites: { maxPanelesArreglo: 1, coberturaMinimaPct: 99 } })
    );
    expect(resultado.advertencias).toContain('COBERTURA_BAJO_MINIMO');
    expect(resultado.advertencias).toContain('PERFILES_COLAPSADOS');
    expect(resultado.paquetes.length).toBe(1);
    expect(unionPerfiles(resultado.paquetes).sort()).toEqual(['economico', 'equilibrado', 'maximoAhorro']);
  });

  test('ARREGLO_TRUNCADO cuando maxPanelesArreglo acota nMax', () => {
    const resultado = recomendarPaquetes(entradaBase({ limites: { maxPanelesArreglo: 2 } }));
    expect(resultado.advertencias).toContain('ARREGLO_TRUNCADO');
    for (const paquete of resultado.paquetes) {
      expect(paquete.cantPaneles).toBeLessThanOrEqual(2);
    }
  });
});

describe('recomendarPaquetes - cobertura y topes', () => {
  test('ningún paquete excede coberturaMaximaPct con el catálogo completo y fixture real', () => {
    const resultado = recomendarPaquetes(entradaBase());
    expect(resultado.paquetes.length).toBeGreaterThan(0);
    for (const paquete of resultado.paquetes) {
      // 120 % por defecto: el margen sobre el 100 % existe para que "Máximo
      // ahorro" cubra el consumo entero pese al redondeo hacia abajo, y para
      // dar aire a degradación y crecimiento del consumo.
      expect(paquete.coberturaPct).toBeLessThanOrEqual(120);
      expect(paquete.coberturaPct).toBeGreaterThanOrEqual(0);
    }
  });

  test('el tope por defecto deja pasar del 100 % pero no se dispara', () => {
    // La razón de ser del margen: con tope exacto de 100 y redondeo hacia
    // abajo, el mejor arreglo se quedaba en 95.7 % y "Máximo ahorro" nunca
    // cubría el consumo. Pero el excedente anual no consumido se pierde, así
    // que el margen tiene que seguir siendo acotado.
    const resultado = recomendarPaquetes(entradaBase());
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));

    expect(maximoAhorro).toBeDefined();
    expect(maximoAhorro!.coberturaPct).toBeGreaterThan(100);
    expect(maximoAhorro!.coberturaPct).toBeLessThanOrEqual(120);
  });

  test('Jinko 615 + fixture real: con el tope por defecto llega a 6 paneles y cubre el consumo', () => {
    // 6 paneles son el 114.8 % del consumo: caben bajo el 120 % por defecto.
    // El 7º (134 %) ya no, que es lo que evita el sobredimensionado absurdo.
    const soloJinko: PanelData[] = PANELES_INICIALES.filter((p) => p.clave === 'jinko_615');
    const resultado = recomendarPaquetes(entradaBase({ paneles: soloJinko }));
    for (const paquete of resultado.paquetes) {
      expect(paquete.cantPaneles).toBeLessThanOrEqual(6);
    }
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));
    expect(maximoAhorro?.cantPaneles).toBe(6);
    expect(maximoAhorro!.coberturaPct).toBeGreaterThan(100);
  });

  test('con el tope en 100 el máximo se queda por debajo (comportamiento anterior, aún disponible)', () => {
    const soloJinko: PanelData[] = PANELES_INICIALES.filter((p) => p.clave === 'jinko_615');
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: soloJinko, limites: { coberturaMaximaPct: 100 } })
    );
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));
    expect(maximoAhorro?.cantPaneles).toBe(5);
    expect(maximoAhorro!.coberturaPct).toBeLessThanOrEqual(100);
  });

  test('coberturaMaximaPct más alto permite 6 paneles (el tope es parámetro, no constante)', () => {
    // Con los números reales del fixture (consumo 794.6667, panel 615W),
    // 110% no alcanza a habilitar el 6º panel (requeriría ~114.8%); se usa
    // 115% para demostrar que el tope es un parámetro del cálculo y no una
    // constante horneada en el algoritmo.
    const soloJinko: PanelData[] = PANELES_INICIALES.filter((p) => p.clave === 'jinko_615');
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: soloJinko, limites: { coberturaMaximaPct: 115 } })
    );
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));
    expect(maximoAhorro?.cantPaneles).toBe(6);
    expect(maximoAhorro?.coberturaPct).toBeLessThanOrEqual(115);
  });

  test('con costoFijo + costoPorPanel realistas, económico tiene la inversión mínima y máximo ahorro la cobertura máxima', () => {
    const resultado = recomendarPaquetes(
      entradaBase({ costos: { costoFijo: 10800, costoPorPanel: 7080 } })
    );
    const economico = resultado.paquetes.find((p) => p.perfiles.includes('economico'));
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));
    expect(economico).toBeDefined();
    expect(maximoAhorro).toBeDefined();

    for (const paquete of resultado.paquetes) {
      expect(economico!.inversionEstimada).toBeLessThanOrEqual(paquete.inversionEstimada);
      expect(maximoAhorro!.coberturaPct).toBeGreaterThanOrEqual(paquete.coberturaPct);
    }
  });

  test('económico no colapsa en 1 panel cuando existe un candidato que alcanza el piso de cobertura', () => {
    const resultado = recomendarPaquetes(entradaBase());
    const economico = resultado.paquetes.find((p) => p.perfiles.includes('economico'));
    expect(economico).toBeDefined();
    expect(economico!.cantPaneles).not.toBe(1);
    expect(economico!.coberturaPct).toBeGreaterThanOrEqual(60);
  });
});

describe('recomendarPaquetes - equilibrado (rodilla de Pareto)', () => {
  test('equilibrado cae en una rodilla real cuando hay un salto de precio de inversor, no en un extremo', () => {
    // Catálogo sintético: un panel, y dos inversores con un salto de precio
    // marcado a partir de cierta cantidad de paneles. Esto rompe la
    // linealidad ahorro/inversión y debe producir una rodilla interior real.
    const panel: PanelData = {
      clave: 'panel_test',
      nombre: 'Panel test',
      watts: 600,
      factorBifacial: 1,
      precioUnitario: 4000,
      activo: true,
      orden: 0,
    };
    const inversorBarato: InversorData = {
      clave: 'inv_barato',
      nombre: 'Inversor barato',
      wattsMax: 4000,
      precioUnitario: 8000,
      activo: true,
      orden: 0,
    };
    const inversorCaro: InversorData = {
      clave: 'inv_caro',
      nombre: 'Inversor caro grande',
      wattsMax: 20000,
      precioUnitario: 60000,
      activo: true,
      orden: 1,
    };

    const resultado = recomendarPaquetes(
      entradaBase({
        paneles: [panel],
        inversores: [inversorBarato, inversorCaro],
        consumoPromedioKwh: 3000,
        limites: { maxPanelesArreglo: 30, coberturaMinimaPct: 0, maxInversoresIguales: 4 },
      })
    );

    const economico = resultado.paquetes.find((p) => p.perfiles.includes('economico'))!;
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'))!;
    const equilibrado = resultado.paquetes.find((p) => p.perfiles.includes('equilibrado'))!;

    expect(equilibrado.cantPaneles).toBeGreaterThan(economico.cantPaneles);
    expect(equilibrado.cantPaneles).toBeLessThan(maximoAhorro.cantPaneles);
  });

  test('con costoFijo: 0 y margen sobre el 100 %, los tres perfiles siguen siendo distintos', () => {
    // Antes, con el tope exacto en 100 %, el rango de arreglos viables era tan
    // estrecho que equilibrado y máximo ahorro caían en el mismo paquete y
    // salía PERFILES_COLAPSADOS. Con el margen hay sitio para una rodilla real.
    const soloJinko: PanelData[] = PANELES_INICIALES.filter((p) => p.clave === 'jinko_615');
    const soloUnInversor: InversorData[] = INVERSORES_INICIALES.filter((i) => i.clave === 'growatt_10k_x2');
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: soloJinko, inversores: soloUnInversor, costos: { costoFijo: 0, costoPorPanel: 0 } })
    );

    const economico = resultado.paquetes.find((p) => p.perfiles.includes('economico'))!;
    const equilibrado = resultado.paquetes.find((p) => p.perfiles.includes('equilibrado'))!;
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'))!;

    expect(economico.cantPaneles).toBeLessThan(equilibrado.cantPaneles);
    expect(equilibrado.cantPaneles).toBeLessThan(maximoAhorro.cantPaneles);
    expect(resultado.advertencias).not.toContain('PERFILES_COLAPSADOS');
  });

  test('no avisa de cobertura inalcanzable cuando el arreglo sí cubre el consumo', () => {
    // El aviso mide contra el 100 %, no contra el tope: un paquete al 114.8 %
    // con tope 115 cubre de sobra y no debe alarmar.
    const soloJinko: PanelData[] = PANELES_INICIALES.filter((p) => p.clave === 'jinko_615');
    const resultado = recomendarPaquetes(entradaBase({ paneles: soloJinko }));
    expect(resultado.advertencias).not.toContain('COBERTURA_MAXIMA_NO_ALCANZABLE');
  });
});

describe('recomendarPaquetes - selección de inversor', () => {
  test('un arreglo pequeño elige un inversor pequeño, nunca el de 14000 W', () => {
    const resultado = recomendarPaquetes(entradaBase());
    const pequenos = resultado.paquetes.filter((p) => p.cantPaneles <= 3);
    for (const paquete of pequenos) {
      expect(paquete.inversor.wattsMax).toBeLessThan(14000);
    }
  });

  test('un arreglo de ~20000 W DC usa cantInversores >= 2 y k*wattsMax >= wattsDc', () => {
    const jinko = PANELES_INICIALES.find((p) => p.clave === 'jinko_615')!;
    // consumo elegido para que el arreglo de cobertura máxima (100%) caiga en
    // ~32 paneles * 615W = ~19680 W DC, forzando a necesitar >1 inversor.
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: [jinko], consumoPromedioKwh: 4866, limites: { maxPanelesArreglo: 40 } })
    );
    const maximoAhorro = resultado.paquetes.find((p) => p.perfiles.includes('maximoAhorro'));
    expect(maximoAhorro).toBeDefined();
    expect(maximoAhorro!.tamanoSistema).toBeGreaterThan(19000);
    expect(maximoAhorro!.cantInversores).toBeGreaterThanOrEqual(2);
    expect(maximoAhorro!.cantInversores * maximoAhorro!.inversor.wattsMax).toBeGreaterThanOrEqual(maximoAhorro!.tamanoSistema);
  });

  test('relacionCargaInversor siempre en [relacionCargaMinima, 1] salvo INVERSOR_SOBREDIMENSIONADO', () => {
    const resultado = recomendarPaquetes(entradaBase());
    for (const paquete of resultado.paquetes) {
      if (!paquete.advertencias.includes('INVERSOR_SOBREDIMENSIONADO')) {
        expect(paquete.relacionCargaInversor).toBeGreaterThanOrEqual(0.6);
        expect(paquete.relacionCargaInversor).toBeLessThanOrEqual(1);
      }
    }
  });

  test('INVERSOR_SOBREDIMENSIONADO: catálogo con un único inversor gigante y consumo mínimo', () => {
    const panelChico: PanelData[] = [
      { clave: 'p1', nombre: 'P1', watts: 400, factorBifacial: 1, precioUnitario: 3000, activo: true, orden: 0 },
    ];
    const inversorGigante: InversorData[] = [
      { clave: 'gigante', nombre: 'Gigante', wattsMax: 50000, precioUnitario: 90000, activo: true, orden: 0 },
    ];
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: panelChico, inversores: inversorGigante, consumoPromedioKwh: 100 })
    );
    expect(resultado.paquetes.length).toBeGreaterThan(0);
    const algunoSobredimensionado = resultado.paquetes.some((p) => p.advertencias.includes('INVERSOR_SOBREDIMENSIONADO'));
    expect(algunoSobredimensionado).toBe(true);
  });

  test('empate de precio entre inversores: elige el de menor wattsMax', () => {
    const panel: PanelData = {
      clave: 'p1',
      nombre: 'P1',
      watts: 600,
      factorBifacial: 1,
      precioUnitario: 4000,
      activo: true,
      orden: 0,
    };
    const inversorChico: InversorData = {
      clave: 'chico',
      nombre: 'Chico',
      wattsMax: 5000,
      precioUnitario: 10000,
      activo: true,
      orden: 0,
    };
    const inversorGrande: InversorData = {
      clave: 'grande',
      nombre: 'Grande',
      wattsMax: 10000,
      precioUnitario: 10000,
      activo: true,
      orden: 1,
    };

    const resultado = recomendarPaquetes(
      entradaBase({
        paneles: [panel],
        inversores: [inversorGrande, inversorChico],
        consumoPromedioKwh: 2000,
        limites: { maxPanelesArreglo: 5, coberturaMinimaPct: 0 },
      })
    );
    const con5 = resultado.paquetes.find((p) => p.cantPaneles === 5) ?? resultado.paquetes[0];
    expect(con5?.inversor.clave).toBe('chico');
  });
});

describe('recomendarPaquetes - colapso y perfiles únicos', () => {
  test('un solo panel y un solo inversor devuelve 1 paquete con los 3 perfiles y PERFILES_COLAPSADOS', () => {
    const panel: PanelData[] = [
      { clave: 'unico', nombre: 'Único', watts: 600, factorBifacial: 1, precioUnitario: 4000, activo: true, orden: 0 },
    ];
    const inversor: InversorData[] = [
      { clave: 'unico_inv', nombre: 'Único inv', wattsMax: 1000, precioUnitario: 8000, activo: true, orden: 0 },
    ];
    const resultado = recomendarPaquetes(
      entradaBase({ paneles: panel, inversores: inversor, consumoPromedioKwh: 200, limites: { maxPanelesArreglo: 1, coberturaMinimaPct: 0 } })
    );
    expect(resultado.paquetes.length).toBe(1);
    expect(unionPerfiles(resultado.paquetes).sort()).toEqual(['economico', 'equilibrado', 'maximoAhorro']);
    expect(resultado.advertencias).toContain('PERFILES_COLAPSADOS');
  });

  test('sin combinaciones duplicadas; la unión de perfiles son exactamente los 3', () => {
    const resultado = recomendarPaquetes(entradaBase());
    const combinaciones = resultado.paquetes.map((p) => `${p.panel.clave}|${p.cantPaneles}|${p.inversor.clave}|${p.cantInversores}`);
    expect(new Set(combinaciones).size).toBe(combinaciones.length);
    expect(unionPerfiles(resultado.paquetes).sort()).toEqual(['economico', 'equilibrado', 'maximoAhorro']);
  });
});

describe('recomendarPaquetes - consistencia con el motor de dimensionamiento', () => {
  test('re-llamar calcularDimensionamiento reproduce exactamente produccion, nuevoPago y ahorroPorPeriodo (cuando hay pago capturado)', () => {
    const resultado = recomendarPaquetes(entradaBase());
    for (const paquete of resultado.paquetes) {
      const dimension = calcularDimensionamiento({
        panel: paquete.panel,
        cantPaneles: paquete.cantPaneles,
        consumoPromedioKwh,
        pagoPromedioCFE,
        factores: FACTORES,
      });
      expect(paquete.produccion).toBeCloseTo(dimension.produccion, 8);
      expect(paquete.nuevoPago).toBeCloseTo(dimension.nuevoPago, 8);
      expect(paquete.ahorroPorPeriodo).toBeCloseTo(dimension.ahorro, 8);
    }
  });

  test('ahorroAnual === ahorroPorPeriodo * 6', () => {
    const resultado = recomendarPaquetes(entradaBase());
    for (const paquete of resultado.paquetes) {
      expect(paquete.ahorroAnual).toBeCloseTo(paquete.ahorroPorPeriodo * 6, 10);
    }
  });

  test('inversionEstimada coincide con la suma manual (n*precioPanel + k*precioInversor + costoFijo + n*costoPorPanel)', () => {
    const resultado = recomendarPaquetes(entradaBase({ costos: { costoFijo: 10800, costoPorPanel: 7080 } }));
    for (const paquete of resultado.paquetes) {
      const esperado =
        paquete.cantPaneles * paquete.panel.precioUnitario +
        paquete.cantInversores * paquete.inversor.precioUnitario +
        10800 +
        paquete.cantPaneles * 7080;
      expect(paquete.inversionEstimada).toBeCloseTo(esperado, 6);
    }
  });

  test('determinismo: barajar los arreglos de catálogo no cambia el resultado', () => {
    const resultadoOriginal = recomendarPaquetes(entradaBase());
    const panelesBarajados = [...PANELES_INICIALES].reverse();
    const inversoresBarajados = [...INVERSORES_INICIALES].reverse();
    const resultadoBarajado = recomendarPaquetes(
      entradaBase({ paneles: panelesBarajados, inversores: inversoresBarajados })
    );
    expect(resultadoBarajado).toEqual(resultadoOriginal);
  });

  test('la inversión de un paquete cuadra con lo que cotizaría el Paso 4', () => {
    // Guarda de regresión del bug que esto arregla: `page.tsx` cotizaba los
    // paneles e inversores con dos precios escritos a mano (4400 y 13500) en
    // lugar de `precioUnitario` del catálogo. Coincidían con los de la semilla,
    // así que nadie lo notaba — hasta que alguien editaba un precio en
    // Configuración y las tarjetas de recomendación decían una cifra mientras
    // la cotización decía otra. Este test ancla que ambas partan del catálogo.
    const costoFijo = 10800;
    const resultado = recomendarPaquetes(entradaBase({ costos: { costoFijo } }));
    expect(resultado.paquetes.length).toBeGreaterThan(0);

    for (const paquete of resultado.paquetes) {
      // Los dos conceptos que el Paso 4 deriva del equipo elegido.
      const conceptosDelEquipo: ConceptoCotizacion[] = [
        {
          id: '1',
          concepto: 'Precio de paneles',
          costoBase: paquete.cantPaneles * paquete.panel.precioUnitario,
          margenPorcentaje: 0,
        },
        {
          id: '2',
          concepto: 'Precio de inversores',
          costoBase: paquete.cantInversores * paquete.inversor.precioUnitario,
          margenPorcentaje: 0,
        },
      ];

      const totales = calcularTotalesCotizacion({
        conceptos: conceptosDelEquipo,
        cargosEditables: [],
        precioEstructura: costoFijo,
        descuento5: false,
        descuento10: false,
        incluirIva: false,
        ivaPorcentaje: 16,
      });

      // Sin `costoPorPanel`, la inversión estimada de la tarjeta es exactamente
      // equipo + costo fijo, que es el subtotal general de la cotización.
      expect(totales.subtotalGeneral).toBeCloseTo(paquete.inversionEstimada, 6);
    }
  });
});
