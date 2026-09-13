import { contextBridge, ipcRenderer } from "electron";

function leerApiBaseUrl(): string {
  const arg = process.argv.find((a) => a.startsWith("--api-base-url="));
  return arg ? arg.slice("--api-base-url=".length) : "";
}

interface GenerarPdfPayload {
  tipo: string;
  proyectoId: string;
  nombreSugerido?: string;
}

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping"),
  apiBaseUrl: leerApiBaseUrl(),
  generarPdf: (payload: GenerarPdfPayload) => ipcRenderer.invoke("generar-pdf", payload),
  abrirArchivo: (ruta: string) => ipcRenderer.invoke("abrir-archivo", ruta),
});
