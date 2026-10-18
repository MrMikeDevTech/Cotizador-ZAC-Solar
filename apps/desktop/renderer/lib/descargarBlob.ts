/**
 * Guarda un blob como archivo en el equipo del usuario.
 *
 * Un `<a download>` sintético es la única forma que tiene el navegador de
 * iniciar una descarga desde datos que ya están en memoria. El `objectURL` se
 * revoca en cuanto el clic está despachado: la descarga ya tiene su propia
 * referencia a los bytes, y dejarlo vivo filtraría el blob durante toda la
 * sesión.
 */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
