import { app } from "electron";
import path from "node:path";

/**
 * Ruta del archivo SQLite dentro del directorio de datos del usuario
 * (persiste entre actualizaciones de la app; distinto por SO).
 */
export function resolverRutaBaseDatos(): string {
  return path.join(app.getPath("userData"), "cotizador.db");
}
