import { describe, expect, test } from 'bun:test';
import { etiquetasDePeriodo } from './periodos.ts';

describe('etiquetasDePeriodo', () => {
  test('bimestral: el periodo 0 parte del mes de la fecha y los siguientes van hacia atrás de 2 en 2', () => {
    expect(etiquetasDePeriodo('2026-06-12', 'Bimestral', 0)).toEqual({
      inicioStr: 'junio 2026',
      terminoStr: 'agosto 2026',
    });
    expect(etiquetasDePeriodo('2026-06-12', 'Bimestral', 1)).toEqual({
      inicioStr: 'abril 2026',
      terminoStr: 'junio 2026',
    });
    expect(etiquetasDePeriodo('2026-06-12', 'Bimestral', 5)).toEqual({
      inicioStr: 'agosto 2025',
      terminoStr: 'octubre 2025',
    });
  });

  test('mensual: de 1 en 1', () => {
    expect(etiquetasDePeriodo('2026-03-15', 'Mensual', 0)).toEqual({
      inicioStr: 'marzo 2026',
      terminoStr: 'abril 2026',
    });
    expect(etiquetasDePeriodo('2026-03-15', 'Mensual', 3)).toEqual({
      inicioStr: 'diciembre 2025',
      terminoStr: 'enero 2026',
    });
  });

  test('cruza el cambio de año', () => {
    expect(etiquetasDePeriodo('2026-01-10', 'Bimestral', 1)).toEqual({
      inicioStr: 'noviembre 2025',
      terminoStr: 'enero 2026',
    });
  });

  test('sin fecha completa o inválida: null', () => {
    expect(etiquetasDePeriodo('', 'Bimestral', 0)).toBeNull();
    expect(etiquetasDePeriodo('2026-06', 'Bimestral', 0)).toBeNull();
    expect(etiquetasDePeriodo('xxxx-yy-zz', 'Bimestral', 0)).toBeNull();
  });

  test('las etiquetas son las que `parsearPeriodo` sabe leer (minúsculas, mes completo)', () => {
    const e = etiquetasDePeriodo('2026-06-12', 'Bimestral', 0)!;
    expect(e.inicioStr).toMatch(/^[a-záéíóú]+ \d{4}$/);
  });
});
