import { distanciaEdicion, sinAcentos } from './textoRecibo.ts';

/**
 * Busca en el catálogo de localidades de Configuración el municipio que
 * corresponde al domicilio de un recibo CFE.
 *
 * El Paso 2 solo acepta pares "Estado - Municipio" que existan en el catálogo
 * (de ahí salen el factor de producción, las horas sol y las tarifas), así que
 * no sirve pasar el texto del recibo tal cual: hay que encontrar la entrada
 * exacta del catálogo o admitir que no existe. **No** se adivina un municipio
 * parecido de otro estado, ni se toma "el primero" por falta de coincidencia:
 * un municipio equivocado cambia las cifras de la cotización sin que se note.
 */

export interface LocalidadCatalogo {
  estado: string;
  nombre: string;
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

/** Comparable: sin acentos, minúsculas, sin puntuación ni partículas ("Ixtapa de la Concepción" → "ixtapa concepcion"). */
function forma(texto: string): string {
  return sinAcentos(texto)
    .toLowerCase()
    .replace(/[^a-zñ\s]/g, ' ')
    .split(/\s+/)
    .filter((palabra) => palabra !== '' && !PARTICULAS.has(palabra))
    .join(' ');
}

/** Se tolera un error de lectura cada ~7 letras (mínimo 1). */
function toleranciaPara(texto: string): number {
  return Math.max(1, Math.floor(texto.length / 7));
}

export function buscarLocalidadCatalogo(
  buscado: { estado: string; localidad: string; municipio: string },
  catalogo: readonly LocalidadCatalogo[]
): LocalidadCatalogo | null {
  const estado = forma(buscado.estado);
  if (estado === '') return null;

  const delEstado = catalogo.filter((entrada) => forma(entrada.estado) === estado);
  if (delEstado.length === 0) return null;

  // El municipio impreso es el dato más fiable; la localidad (colonia/pueblo) es el respaldo.
  const candidatos = [buscado.municipio, buscado.localidad].map(forma).filter((c) => c !== '');

  for (const candidato of candidatos) {
    // 1. Igualdad exacta (ya sin acentos ni partículas).
    const exacta = delEstado.find((entrada) => forma(entrada.nombre) === candidato);
    if (exacta) return exacta;

    // 2. Lo buscado es una versión corta del nombre del catálogo, o al revés
    //    ("ixtapa" ⊂ "ixtapa concepcion"). Solo vale si hay una única entrada.
    if (candidato.length >= 5) {
      const contenidas = delEstado.filter((entrada) => {
        const nombre = forma(entrada.nombre);
        return nombre.includes(candidato) || candidato.includes(nombre);
      });
      if (contenidas.length === 1) return contenidas[0]!;
    }

    // 3. Una letra mal leída ("sxtapa" ≈ "ixtapa"): la entrada más cercana si
    //    es una sola y está dentro de la tolerancia.
    const cercanas = delEstado
      .map((entrada) => ({ entrada, distancia: distanciaEdicion(forma(entrada.nombre), candidato) }))
      .filter(({ distancia }) => distancia <= toleranciaPara(candidato))
      .sort((a, b) => a.distancia - b.distancia);
    if (cercanas.length === 1 || (cercanas.length > 1 && cercanas[0]!.distancia < cercanas[1]!.distancia)) {
      return cercanas[0]!.entrada;
    }
  }

  return null;
}
