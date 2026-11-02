/**
 * Marca y modelo de un equipo a partir del nombre de catálogo.
 *
 * Los nombres del catálogo siguen la forma "Marca, Modelo": `Growatt, MIN
 * 2500TL - X2`, `Jinko, JKM615N-78HL4-V.`, `Canadian Solar, CS6.2-66TB-620-
 * Bifacial al 10%.`. La marca es **todo lo anterior a la primera coma** (no solo
 * la última palabra: "Canadian Solar" son dos) y el modelo, lo que sigue sin el
 * punto final de la oración.
 *
 * Si el nombre no tiene coma (un equipo capturado a mano en Configuración) no
 * hay forma de saber dónde acaba la marca: se deja vacía y el nombre completo
 * va como modelo, en vez de adivinar. Nunca se usa la `clave` interna
 * (`growatt_2500`), que no es un dato para el cliente.
 */
export function separarMarcaYModelo(nombre: string): { marca: string; modelo: string } {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  const coma = limpio.indexOf(',');

  const quitarPuntoFinal = (texto: string) => texto.replace(/\.$/, '').trim();

  if (coma < 0) return { marca: '', modelo: quitarPuntoFinal(limpio) };

  return {
    marca: limpio.slice(0, coma).trim(),
    modelo: quitarPuntoFinal(limpio.slice(coma + 1)),
  };
}
