import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDacPage, extraerSelects } from './dac.ts';

const fixturesDir = join(import.meta.dirname, '__fixtures__');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parseDacPage', () => {
  test('DAC 2025-07: extrae 6 regiones correctamente', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    assert.equal(rates.length, 6, 'Debe extraer exactamente 6 regiones');

    const regionNames = rates.map((r) => r.region);
    assert.deepEqual(regionNames, [
      'Baja California',
      'Baja California Sur',
      'Central',
      'Noroeste',
      'Norte y Noreste',
      'Sur y Peninsular',
    ]);
  });

  test('Baja California: 4 celdas con temporada', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    const bc = rates.find((r) => r.region === 'Baja California');
    assert.ok(bc, 'Debe encontrar Baja California');

    assert.equal(bc.cargoFijo, 142.25);
    assert.equal(bc.precioKwhVerano, 6.348);
    assert.equal(bc.precioKwh, 5.453);
  });

  test('Central: 3 celdas sin temporada diferenciada', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    const central = rates.find((r) => r.region === 'Central');
    assert.ok(central, 'Debe encontrar Central');

    assert.equal(central.cargoFijo, 142.25);
    assert.equal(central.precioKwh, 6.529);
    assert.equal(central.precioKwhVerano, null);
  });

  test('Los precios son números, no contienen $ ni espacios', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    for (const rate of rates) {
      assert.equal(typeof rate.cargoFijo, 'number', `cargoFijo debe ser número para ${rate.region}`);
      assert.equal(typeof rate.precioKwh, 'number', `precioKwh debe ser número para ${rate.region}`);

      // Verificar que no contienen caracteres especiales
      const cargoStr = rate.cargoFijo.toString();
      assert.ok(!cargoStr.includes('$') && !cargoStr.includes(' '));

      const precioStr = rate.precioKwh.toString();
      assert.ok(!precioStr.includes('$') && !precioStr.includes(' '));

      if (rate.precioKwhVerano !== null) {
        const verano = rate.precioKwhVerano.toString();
        assert.ok(!verano.includes('$') && !verano.includes(' '));
      }
    }
  });

  test('HTML sin tablas de datos -> devuelve []', () => {
    const html = '<html><body><p>sin datos</p></body></html>';
    const rates = parseDacPage(html);
    assert.deepEqual(rates, [], 'Debe devolver array vacío si no hay tablas');
  });

  test('Baja California Sur: temporada correcta', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    const bcs = rates.find((r) => r.region === 'Baja California Sur');
    assert.ok(bcs, 'Debe encontrar Baja California Sur');

    assert.equal(bcs.cargoFijo, 142.25);
    assert.equal(bcs.precioKwhVerano, 6.917);
    assert.equal(bcs.precioKwh, 5.453);
  });

  test('Noroeste: sin temporada', () => {
    const html = loadFixture('DAC-2025-07.html');
    const rates = parseDacPage(html);

    const noroeste = rates.find((r) => r.region === 'Noroeste');
    assert.ok(noroeste, 'Debe encontrar Noroeste');

    assert.equal(noroeste.cargoFijo, 142.25);
    assert.equal(noroeste.precioKwh, 6.118);
    assert.equal(noroeste.precioKwhVerano, null);
  });
});

describe('extraerSelects — descubrimiento del control de mes', () => {
  // Regresión de un bug real: el nombre del control de mes de DAC NO es fijo,
  // cambia según el año seleccionado. Estaba hardcodeado a `MesVerano3` y por
  // eso el postback devolvía HTTP 500 justo en el año en curso, que es el caso
  // por defecto. La solución es leerlo de la respuesta, no asumirlo.
  const htmlConMesVerano3 = `<html><body><form>
    <select name="ctl00$ContentPlaceHolder1$Fecha$ddAnio"><option value="2025" selected>2025</option></select>
    <select name="ctl00$ContentPlaceHolder1$MesVerano3$ddMesConsulta"><option value="0" selected>---</option></select>
  </form></body></html>`;

  const htmlConFecha1 = `<html><body><form>
    <select name="ctl00$ContentPlaceHolder1$Fecha$ddAnio"><option value="2026" selected>2026</option></select>
    <select name="ctl00$ContentPlaceHolder1$Fecha1$ddMes"><option value="0" selected>---</option></select>
  </form></body></html>`;

  test('descubre el control de mes cuando CFE lo llama MesVerano3 (año 2025)', () => {
    const campos = extraerSelects(htmlConMesVerano3);
    const campoMes = Object.keys(campos).find((n) => /ddMes/i.test(n));
    assert.equal(campoMes, 'ctl00$ContentPlaceHolder1$MesVerano3$ddMesConsulta');
  });

  test('descubre el control de mes cuando CFE lo llama Fecha1 (año 2026)', () => {
    const campos = extraerSelects(htmlConFecha1);
    const campoMes = Object.keys(campos).find((n) => /ddMes/i.test(n));
    assert.equal(campoMes, 'ctl00$ContentPlaceHolder1$Fecha1$ddMes');
  });

  test('conserva el valor seleccionado de cada select (ASP.NET exige el estado completo)', () => {
    const campos = extraerSelects(htmlConFecha1);
    assert.equal(campos['ctl00$ContentPlaceHolder1$Fecha$ddAnio'], '2026');
  });

  test('sin selects devuelve un objeto vacío, no lanza', () => {
    assert.deepEqual(extraerSelects('<html><body><p>nada</p></body></html>'), {});
  });
});
