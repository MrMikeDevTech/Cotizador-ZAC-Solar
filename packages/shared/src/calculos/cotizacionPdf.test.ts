import { describe, expect, test } from 'bun:test';
import { construirCotizacionPdf } from './cotizacionPdf.ts';
import type {
  ContactoCotizable,
  CotizacionCotizable,
  EntradaCotizacionPdf,
  ProyectoCotizable,
} from './cotizacionPdf.ts';
import type { EmpresaPdf } from '../types/cotizacionPdf.ts';

const CONTACTO_BASE: ContactoCotizable = {
  nombre: 'Juan',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: 'López',
  telefono: '3312345678',
  celular: '',
  localidad: 'Zapopan',
  estado: 'Jalisco',
  esEmpresa: false,
  razonSocial: '',
};

const EMPRESA_BASE: EmpresaPdf = {
  nombre: 'ZAC Solar',
  telefono: '3300000000',
  localidad: 'Guadalajara, Jalisco',
  email: 'contacto@zacsolar.mx',
  tituloCotizacion: 'Cotización de sistema fotovoltaico',
  introPlantilla:
    'Le proponemos un sistema de {kwp} kWp con producción estimada de {kwh} kWh por periodo.',
  observaciones: 'Precios en MXN.\nVigencia de 15 días.\n\nIncluye instalación.',
  firmaNombre: 'Ana Torres',
  firmaPuesto: 'Gerente comercial',
};

/** Cotización realista: 4 conceptos de plantilla, estructura "Teja", sin descuento ni IVA. */
function cotizacionBase(overrides: Partial<CotizacionCotizable> = {}): CotizacionCotizable {
  return {
    panelNombre: 'Canadian Solar, CS6.2-66TB-620- Bifacial al 20%.',
    cantPaneles: 6,
    inversorNombre: 'Growatt, MIC 3300TL - X2',
    cantInversores: 1,
    estructuraNombre: 'Teja',
    estructuraPrecio: 10800,
    tamanoSistemaW: 3720,
    produccionPeriodo: 1200,
    subtotalGeneral: 57780,
    montoDescuento: 0,
    subtotalConDescuento: 57780,
    montoIva: 0,
    granTotal: 57780,
    metodoPago: 'Contado',
    incluirIva: false,
    ocultarDesglose: false,
    descuento5: false,
    descuento10: false,
    // Conceptos calibrados para que coincidan exactamente con subtotalGeneral (57780):
    // 20000 + 13000 + 8000 + 5980 = 46980; + estructura (10800) = 57780.
    conceptos: [
      { concepto: 'Precio de paneles', costoBase: 20000, margenPorcentaje: 0, orden: 0 },
      { concepto: 'Precio de inversores', costoBase: 13000, margenPorcentaje: 0, orden: 1 },
      { concepto: 'Precio material eléctrico', costoBase: 8000, margenPorcentaje: 0, orden: 2 },
      { concepto: 'Mano de obra', costoBase: 5980, margenPorcentaje: 0, orden: 3 },
    ],
    cargos: [],
    ...overrides,
  };
}

function proyectoBase(
  cotizacion: CotizacionCotizable,
  contacto: ContactoCotizable = CONTACTO_BASE
): ProyectoCotizable {
  return {
    nombre: 'Proyecto Pérez López',
    localidadConsumo: 'Zapopan, Jalisco',
    contacto,
    cotizaciones: [cotizacion],
  };
}

function entradaBase(overrides: Partial<EntradaCotizacionPdf> = {}): EntradaCotizacionPdf {
  return {
    proyecto: proyectoBase(cotizacionBase()),
    empresa: EMPRESA_BASE,
    fecha: new Date(2026, 7, 28), // 28/Agosto/2026
    ...overrides,
  };
}

function sumaLineas(lineas: { importe: number }[]): number {
  return lineas.reduce((acc, l) => acc + l.importe, 0);
}

describe('construirCotizacionPdf — invariante de suma', () => {
  test('sin descuento ni IVA: la suma de líneas es igual a granTotal', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
    expect(Math.round(sumaLineas(resultado.lineas) * 100) / 100).toBe(resultado.total);
  });

  test('con descuento: la suma de líneas sigue igual a granTotal', () => {
    const cotizacion = cotizacionBase({
      descuento5: true,
      descuento10: true,
      montoDescuento: 8667, // 15% de 57780
      subtotalConDescuento: 49113,
      granTotal: 49113,
    });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
    expect(Math.round(sumaLineas(resultado.lineas) * 100) / 100).toBe(resultado.total);

    const lineaDescuento = resultado.lineas.find((l) => l.descripcion.includes('Descuento'));
    expect(lineaDescuento).toBeDefined();
    expect(lineaDescuento!.importe).toBeLessThan(0);
    expect(lineaDescuento!.descripcion).toContain('15%');
  });

  test('un desvío grande no corrompe la última línea: se emite como "Ajuste" visible', () => {
    // Datos incoherentes a propósito: `granTotal` no corresponde a los
    // conceptos guardados. Absorberlo en la última línea producía cosas como
    // "IVA: −275.20" en un documento que ve el cliente.
    const cotizacion = cotizacionBase({
      incluirIva: true,
      montoIva: 9244.8,
      granTotal: 50000, // debería ser 67024.8
    });
    const resultado = construirCotizacionPdf(entradaBase({ proyecto: proyectoBase(cotizacion) }));

    const lineaIva = resultado.lineas.find((l) => l.descripcion === 'IVA');
    expect(lineaIva!.importe).toBeCloseTo(9244.8, 2);

    const ajuste = resultado.lineas.find((l) => l.descripcion === 'Ajuste');
    expect(ajuste).toBeDefined();

    // El invariante se mantiene pese a la incoherencia del origen.
    expect(Math.round(sumaLineas(resultado.lineas) * 100) / 100).toBe(resultado.total);
  });

  test('un residuo de céntimos se absorbe en silencio, sin línea de ajuste', () => {
    const cotizacion = cotizacionBase({ granTotal: 57780.01 });
    const resultado = construirCotizacionPdf(entradaBase({ proyecto: proyectoBase(cotizacion) }));

    expect(resultado.lineas.some((l) => l.descripcion === 'Ajuste')).toBe(false);
    expect(Math.round(sumaLineas(resultado.lineas) * 100) / 100).toBe(resultado.total);
  });

  test('con IVA: la suma de líneas sigue igual a granTotal', () => {
    const cotizacion = cotizacionBase({
      incluirIva: true,
      montoIva: 9244.8, // 16% de 57780
      granTotal: 67024.8,
    });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
    expect(Math.round(sumaLineas(resultado.lineas) * 100) / 100).toBe(resultado.total);

    const lineaIva = resultado.lineas.find((l) => l.descripcion === 'IVA');
    expect(lineaIva).toBeDefined();
    expect(lineaIva!.importe).toBeCloseTo(9244.8, 2);
  });

  test('con descuento y con IVA (y redondeo flotante incómodo): la suma sigue cuadrando', () => {
    // Montos deliberadamente "feos" en coma flotante para forzar el ajuste de céntimos.
    const subtotal = 33333.33;
    const porcentajeDescuento = 5;
    const montoDescuento = subtotal * (porcentajeDescuento / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const montoIva = subtotalConDescuento * 0.16;
    const granTotal = subtotalConDescuento + montoIva;

    const cotizacion = cotizacionBase({
      subtotalGeneral: subtotal,
      descuento5: true,
      descuento10: false,
      montoDescuento,
      subtotalConDescuento,
      incluirIva: true,
      montoIva,
      granTotal,
      conceptos: [
        { concepto: 'Precio de paneles', costoBase: 11111.11, margenPorcentaje: 7, orden: 0 },
        { concepto: 'Precio de inversores', costoBase: 9999.99, margenPorcentaje: 3, orden: 1 },
      ],
      estructuraPrecio: 1234.56,
      cargos: [{ nombre: 'Flete', monto: 777.77, orden: 0 }],
    });

    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );

    const sumaExacta = Math.round(sumaLineas(resultado.lineas) * 100) / 100;
    const totalExacto = Math.round(resultado.total * 100) / 100;
    expect(sumaExacta).toBe(totalExacto);
    expect(sumaExacta - totalExacto).toBe(0);
  });
});

describe('construirCotizacionPdf — cantidades heurísticas', () => {
  test('la línea de paneles usa cantPaneles y menciona la marca', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    const lineaPanel = resultado.lineas.find((l) => l.descripcion.includes('Panel marca'));
    expect(lineaPanel).toBeDefined();
    expect(lineaPanel!.cantidad).toBe(6);
    expect(lineaPanel!.descripcion).toContain('Canadian Solar, CS6.2-66TB-620- Bifacial al 20%.');
  });

  test('la línea de inversores usa cantInversores y menciona la marca', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    const lineaInversor = resultado.lineas.find((l) => l.descripcion.includes('Inversor marca'));
    expect(lineaInversor).toBeDefined();
    expect(lineaInversor!.cantidad).toBe(1);
    expect(lineaInversor!.descripcion).toContain('Growatt, MIC 3300TL - X2');
  });

  test('detecta "Panel" sin distinguir mayúsculas ni acentos', () => {
    const cotizacion = cotizacionBase({
      conceptos: [
        { concepto: 'PANEL Fotovoltáico', costoBase: 20000, margenPorcentaje: 10, orden: 0 },
      ],
      estructuraPrecio: 0,
      granTotal: 22000,
      subtotalGeneral: 22000,
      subtotalConDescuento: 22000,
    });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(resultado.lineas[0]!.cantidad).toBe(6);
    expect(resultado.lineas[0]!.descripcion).toContain('Panel marca');
  });

  test('un concepto renombrado sin "panel" ni "inversor" degrada a cantidad 1 sin romper el total', () => {
    const cotizacion = cotizacionBase({
      conceptos: [
        // 50000 x 1.1556 = 57780 exacto: el test mide la heurística de
        // cantidad, no el ajuste por redondeo.
        { concepto: 'Paquete integral del sistema', costoBase: 50000, margenPorcentaje: 15.56, orden: 0 },
      ],
      estructuraPrecio: 0,
      granTotal: 57780,
      subtotalGeneral: 57780,
      subtotalConDescuento: 57780,
    });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0]!.cantidad).toBe(1);
    expect(resultado.lineas[0]!.descripcion).toBe('Paquete integral del sistema');
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
  });
});

describe('construirCotizacionPdf — líneas condicionales', () => {
  test('estructura con precio 0 y cargos con monto 0 no generan línea', () => {
    const cotizacion = cotizacionBase({
      estructuraPrecio: 0,
      cargos: [
        { nombre: 'Cargo sin costo', monto: 0, orden: 0 },
        { nombre: 'Flete', monto: 500, orden: 1 },
      ],
      subtotalGeneral: 47480,
      subtotalConDescuento: 47480,
      granTotal: 47480,
    });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(resultado.lineas.some((l) => l.descripcion === 'Teja')).toBe(false);
    expect(resultado.lineas.some((l) => l.descripcion === 'Cargo sin costo')).toBe(false);
    expect(resultado.lineas.some((l) => l.descripcion === 'Flete')).toBe(true);
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
  });

  test('ocultarDesglose: true produce exactamente 1 línea cuyo importe es granTotal', () => {
    const cotizacion = cotizacionBase({ ocultarDesglose: true, granTotal: 57780 });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0]!.importe).toBe(57780);
    expect(resultado.lineas[0]!.cantidad).toBe(1);
  });
});

describe('construirCotizacionPdf — sin empresa', () => {
  test('empresa null produce un documento válido sin logo, firma ni observaciones', () => {
    const resultado = construirCotizacionPdf(entradaBase({ empresa: null }));
    expect(resultado.mostrarLogo).toBe(false);
    expect(resultado.firmaNombre).toBe('');
    expect(resultado.firmaPuesto).toBe('');
    expect(resultado.observaciones).toEqual([]);
    expect(resultado.titulo).toBe('Cotización de sistema fotovoltaico');
    expect(sumaLineas(resultado.lineas)).toBeCloseTo(resultado.total, 2);
  });
});

describe('construirCotizacionPdf — cliente', () => {
  test('contacto empresa con razonSocial la usa como cliente', () => {
    const contacto: ContactoCotizable = {
      ...CONTACTO_BASE,
      esEmpresa: true,
      razonSocial: 'Soluciones Industriales SA de CV',
    };
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacionBase(), contacto) })
    );
    expect(resultado.cliente).toBe('Soluciones Industriales SA de CV');
  });

  test('contacto sin nombre da "A QUIEN CORRESPONDA"', () => {
    const contacto: ContactoCotizable = {
      ...CONTACTO_BASE,
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    };
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacionBase(), contacto) })
    );
    expect(resultado.cliente).toBe('A QUIEN CORRESPONDA');
  });

  test('persona física usa nombre completo recortando espacios', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    expect(resultado.cliente).toBe('Juan Pérez López');
  });
});

describe('construirCotizacionPdf — intro', () => {
  test('sustituye {kwp} y {kwh} con los valores correctos', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    // tamanoSistemaW: 3720 -> 3.72 kWp; produccionPeriodo: 1200 -> 1200 kWh
    expect(resultado.intro).toBe(
      'Le proponemos un sistema de 3.72 kWp con producción estimada de 1200 kWh por periodo.'
    );
  });

  test('sin plantilla de empresa, genera un texto por defecto con ambos valores', () => {
    const empresaSinPlantilla: EmpresaPdf = { ...EMPRESA_BASE, introPlantilla: '' };
    const resultado = construirCotizacionPdf(
      entradaBase({ empresa: empresaSinPlantilla })
    );
    expect(resultado.intro).toContain('3.72 kWp');
    expect(resultado.intro).toContain('1200 kWh');
  });

  test('el texto por defecto es un párrafo comercial, no una sola frase', () => {
    const resultado = construirCotizacionPdf(
      entradaBase({ empresa: { ...EMPRESA_BASE, introPlantilla: '' } })
    );
    // El largo es parte del contrato: las capacidades de `paginacion.ts`
    // están calculadas contra este párrafo. Si alguien lo recorta a una
    // frase, la primera página desperdicia una fila; si lo alarga mucho más,
    // la última fila se sale de la hoja y `overflow: hidden` la oculta
    // mientras el TOTAL la sigue sumando.
    expect(resultado.intro.length).toBeGreaterThan(300);
    expect(resultado.intro.length).toBeLessThan(560);
    expect(resultado.intro).toContain('En atención a su interés');
    // El sistema que cotiza esta app se interconecta a CFE: describirlo como
    // aislado en un documento que firma el cliente sería incorrecto.
    expect(resultado.intro).toContain('interconectado a la red de CFE');
    expect(resultado.intro).not.toContain('aislado');
  });
});

describe('construirCotizacionPdf — otros campos de texto', () => {
  test('fecha se formatea en es-MX con mes en palabra', () => {
    const resultado = construirCotizacionPdf(entradaBase({ fecha: new Date(2026, 7, 28) }));
    expect(resultado.fecha).toBe('28/Agosto/2026');
  });

  test('telefono usa celular cuando no hay telefono fijo', () => {
    const contacto: ContactoCotizable = { ...CONTACTO_BASE, telefono: '', celular: '3399998888' };
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacionBase(), contacto) })
    );
    expect(resultado.telefono).toBe('3399998888');
  });

  test('sin telefono ni celular cae en "***"', () => {
    const contacto: ContactoCotizable = { ...CONTACTO_BASE, telefono: '', celular: '' };
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacionBase(), contacto) })
    );
    expect(resultado.telefono).toBe('***');
  });

  test('ubicacion usa localidadConsumo del proyecto si existe', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    expect(resultado.ubicacion).toBe('Zapopan, Jalisco');
  });

  test('ubicacion cae a localidad/estado del contacto si el proyecto no la tiene', () => {
    const proyecto: ProyectoCotizable = {
      ...proyectoBase(cotizacionBase()),
      localidadConsumo: '',
    };
    const resultado = construirCotizacionPdf(entradaBase({ proyecto }));
    expect(resultado.ubicacion).toBe('Zapopan, Jalisco');
  });

  test('observaciones se parten por saltos de línea descartando vacíos', () => {
    const resultado = construirCotizacionPdf(entradaBase());
    expect(resultado.observaciones).toEqual([
      'Precios en MXN.',
      'Vigencia de 15 días.',
      'Incluye instalación.',
    ]);
  });

  test('metodoPago usa Contado por defecto si viene vacío', () => {
    const cotizacion = cotizacionBase({ metodoPago: '' });
    const resultado = construirCotizacionPdf(
      entradaBase({ proyecto: proyectoBase(cotizacion) })
    );
    expect(resultado.metodoPago).toBe('Contado');
  });
});

describe('construirCotizacionPdf — determinismo', () => {
  test('la misma entrada produce exactamente el mismo resultado', () => {
    const entrada = entradaBase();
    const resultado1 = construirCotizacionPdf(entrada);
    const resultado2 = construirCotizacionPdf(entrada);
    expect(resultado1).toEqual(resultado2);
  });
});

describe('construirCotizacionPdf — firmante', () => {
  test('sin firmante en Configuración, firma el usuario de la sesión', () => {
    // Antes el bloque de firma simplemente no se imprimía, dejando el hueco
    // donde el cliente espera un nombre.
    const sinFirmante: EmpresaPdf = { ...EMPRESA_BASE, firmaNombre: '', firmaPuesto: '' };
    const resultado = construirCotizacionPdf(
      entradaBase({ empresa: sinFirmante, firmantePorDefecto: { nombre: 'Diego Rodríguez' } })
    );
    expect(resultado.firmaNombre).toBe('Diego Rodríguez');
  });

  test('el firmante de Configuración gana sobre el de la sesión', () => {
    // Para cuando siempre firma el mismo responsable comercial, cotice quien cotice.
    const resultado = construirCotizacionPdf(
      entradaBase({ firmantePorDefecto: { nombre: 'Quien sea' } })
    );
    expect(resultado.firmaNombre).toBe(EMPRESA_BASE.firmaNombre);
  });

  test('sin empresa y sin sesión no se inventa una firma', () => {
    const resultado = construirCotizacionPdf(entradaBase({ empresa: null }));
    expect(resultado.firmaNombre).toBe('');
  });
});
