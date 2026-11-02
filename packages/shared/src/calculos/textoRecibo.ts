import { estadosMexico } from '../seed/catalogosIniciales.ts';

/**
 * Utilidades de texto para leer recibos CFE. El texto llega de un PDF o de un
 * OCR, así que trae saltos de línea a media frase, espacios dobles y acentos
 * inconsistentes: todo se normaliza aquí, antes de aplicar ninguna regex.
 */

/** Quita los acentos ("Michoacán" → "Michoacan"). */
export function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Un valor en una sola línea: sin saltos, tabuladores ni espacios dobles. */
export function limpiarTexto(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/**
 * Líneas útiles de un texto multilínea: cada una con sus espacios colapsados
 * y sin las vacías. El OCR a veces separa columnas con huecos grandes; para
 * conservar esa pista, quien la necesite debe cortar *antes* de llamar aquí.
 */
export function limpiarLineas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map(limpiarTexto)
    .filter((linea) => linea !== '');
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

/** "MORENO ALVARADO MARTIN" → "Moreno Alvarado Martin"; respeta "de/la/del/y". */
export function aTitulo(texto: string): string {
  return limpiarTexto(texto)
    .toLowerCase()
    .split(' ')
    .map((palabra, indice) => {
      if (palabra === '') return palabra;
      if (indice > 0 && PARTICULAS.has(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

/** Clave comparable: sin acentos, mayúsculas y solo letras ("N.L." → "NL"). */
function clave(texto: string): string {
  return sinAcentos(texto).toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Abreviaturas con las que CFE y Correos imprimen el estado en el domicilio,
 * hacia el nombre exacto de `estadosMexico`. La clave va sin puntos ni
 * espacios (`NAY.` → `NAY`, `S.L.P.` → `SLP`).
 */
const ABREVIATURAS_ESTADO: Record<string, string> = {
  AGS: 'Aguascalientes',
  BC: 'Baja California',
  BCS: 'Baja California Sur',
  CAMP: 'Campeche',
  CHIS: 'Chiapas',
  CHIH: 'Chihuahua',
  CDMX: 'Ciudad de México',
  DF: 'Ciudad de México',
  COAH: 'Coahuila',
  COL: 'Colima',
  DGO: 'Durango',
  MEX: 'Estado de México',
  EDOMEX: 'Estado de México',
  GTO: 'Guanajuato',
  GRO: 'Guerrero',
  HGO: 'Hidalgo',
  JAL: 'Jalisco',
  MICH: 'Michoacán',
  MOR: 'Morelos',
  NAY: 'Nayarit',
  NL: 'Nuevo León',
  OAX: 'Oaxaca',
  PUE: 'Puebla',
  QRO: 'Querétaro',
  QROO: 'Quintana Roo',
  QR: 'Quintana Roo',
  SLP: 'San Luis Potosí',
  SIN: 'Sinaloa',
  SON: 'Sonora',
  TAB: 'Tabasco',
  TAMPS: 'Tamaulipas',
  TAM: 'Tamaulipas',
  TLAX: 'Tlaxcala',
  VER: 'Veracruz',
  YUC: 'Yucatán',
  ZAC: 'Zacatecas',
};

const ESTADO_POR_CLAVE = new Map<string, string>([
  ...estadosMexico.map((estado): [string, string] => [clave(estado), estado]),
  ...Object.entries(ABREVIATURAS_ESTADO),
  ['MEXICO', 'Estado de México'],
  ['COAHUILADEZARAGOZA', 'Coahuila'],
  ['VERACRUZDEIGNACIODELALLAVE', 'Veracruz'],
  ['MICHOACANDEOCAMPO', 'Michoacán'],
]);

/**
 * `NAY.` → `Nayarit`. Acepta también el nombre completo (con o sin acentos)
 * y devuelve `null` si no lo reconoce, para que quien llama decida qué hacer
 * en lugar de inventar un estado.
 */
export function expandirEstado(valor: string): string | null {
  return ESTADO_POR_CLAVE.get(clave(valor)) ?? null;
}

/** Distancia de edición (Levenshtein) entre dos textos cortos. */
export function distanciaEdicion(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0]!;
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temporal = fila[j]!;
      fila[j] = Math.min(
        fila[j]! + 1,
        fila[j - 1]! + 1,
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      anterior = temporal;
    }
  }
  return fila[b.length]!;
}
