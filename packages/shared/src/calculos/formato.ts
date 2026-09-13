export function generarCodigoAbreviado(nombre: string, sufijo: string = '001'): string {
  const palabras = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return `PRJ-${sufijo}`;

  let iniciales = '';
  if (palabras.length >= 3) {
    iniciales = palabras[0]![0]! + palabras[1]![0]! + palabras[2]![0]!;
  } else if (palabras.length === 2) {
    iniciales = palabras[0]!.slice(0, 2) + palabras[1]![0]!;
  } else {
    iniciales = palabras[0]!.slice(0, 3);
  }
  return `${iniciales.toUpperCase()}-${sufijo}`;
}

export function formatearMoneda(monto: number, moneda: string = 'MXN'): string {
  return `$${monto.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${moneda}`;
}
