import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { resolverRutaBaseDatos } from "./db/client.ts";
import { ejecutarMigraciones } from "@cotizador/backend/src/db/migrador.ts";
import { crearClientePrisma } from "@cotizador/backend/src/db/cliente.ts";
import { sembrarCatalogos } from "@cotizador/backend/src/db/seed.ts";
import { crearApp } from "@cotizador/backend/src/app.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Renderer de Next.js (export estático)
//   - En desarrollo con "next dev": cargar desde ELECTRON_RENDERER_URL (ej. http://localhost:3000)
//   - En producción/carpeta: servir apps/desktop/renderer/out por HTTP local.
//
// El export estático de Next (App Router) no se puede cargar con loadFile()/
// file://: los assets de _next usan rutas absolutas y la navegación entre
// páginas hace fetch() de payloads RSC (.txt) con rutas relativas — ambas
// cosas rompen bajo el esquema file:// (sin "origen" real, CORS/fetch fallan
// en silencio y la ventana queda en blanco). Por eso se sirve el export desde
// un servidor HTTP local (igual que el backend) y se carga con loadURL().
// ---------------------------------------------------------------------------

// __dirname en dev es apps/desktop/electron/dist (salida de bun build);
// hay que subir dos niveles para llegar a apps/desktop/renderer.
function resolveRendererOutDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "renderer", "out")
    : path.join(__dirname, "..", "..", "renderer", "out");
}

let servidorRenderer: ReturnType<typeof serve> | null = null;

function iniciarServidorRenderer(): Promise<string> {
  const rendererApp = new Hono();
  rendererApp.use("*", serveStatic({ root: resolveRendererOutDir() }));

  return new Promise((resolve) => {
    servidorRenderer = serve(
      { fetch: rendererApp.fetch, hostname: "127.0.0.1", port: 0 },
      (info) => resolve(`http://127.0.0.1:${info.port}`),
    );
  });
}

async function resolveRendererBaseUrl(): Promise<string> {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) return devUrl;

  const indexPath = path.join(resolveRendererOutDir(), "index.html");
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Cotizador — falta el frontend",
      `No se encontró el export estático del renderer en:\n\n${indexPath}\n\n` +
        "Ejecuta primero:\n  bun run build:renderer",
    );
    app.quit();
    throw new Error("Renderer static export not found");
  }
  return iniciarServidorRenderer();
}

let rendererBaseUrl = "";

function resolveImprimirUrl(tipo: string, proyectoId: string): string {
  const query = `?tipo=${encodeURIComponent(tipo)}&proyectoId=${encodeURIComponent(proyectoId)}`;
  return `${rendererBaseUrl}/documentos/imprimir/${query}`;
}

/** Espera a que la vista de impresión marque `document.title = "LISTO"` (o "ERROR"). */
async function esperarListoParaImprimir(win: BrowserWindow, timeoutMs = 8000): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const titulo: string = await win.webContents.executeJavaScript("document.title");
    if (titulo === "LISTO") return;
    if (titulo === "ERROR") throw new Error("El proyecto no se pudo cargar para generar el documento.");
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Tiempo de espera agotado generando el documento.");
}

// ---------------------------------------------------------------------------
// Backend embebido (Hono + Prisma/SQLite).
//
// main.ts se compila con `bun build` a un único archivo (electron/dist/main.mjs)
// que incluye el código de @cotizador/backend y @cotizador/shared ya transpilado
// (ver package.json → script "build:electron"). Lo único que NO se empaqueta es
// better-sqlite3 (módulo nativo): sigue viviendo en node_modules y electron-builder
// lo desempaqueta del asar (asarUnpack) y lo recompila para el ABI de Electron
// (npmRebuild). Las migraciones (prisma/migrations/*.sql) tampoco son código y se
// copian como recurso aparte (extraResources) en electron-builder.yml.
// ---------------------------------------------------------------------------

function resolveMigrationsDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "backend-prisma-migrations")
    : path.join(__dirname, "..", "..", "..", "backend", "prisma", "migrations");
}

let apiBaseUrl = "";
let servidorApi: ReturnType<typeof serve> | null = null;

async function iniciarBackend(): Promise<string> {
  const dbPath = resolverRutaBaseDatos();
  process.env.DATABASE_URL = `file:${dbPath}`;

  ejecutarMigraciones(dbPath, resolveMigrationsDir());
  const prisma = crearClientePrisma(dbPath);
  await sembrarCatalogos(prisma);

  const honoApp = crearApp(prisma);

  return new Promise((resolve) => {
    servidorApi = serve(
      { fetch: honoApp.fetch, hostname: "127.0.0.1", port: 0 },
      (info) => resolve(`http://127.0.0.1:${info.port}`),
    );
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Cotizador",
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--api-base-url=${apiBaseUrl}`],
    },
  });

  mainWindow.removeMenu();
  mainWindow.maximize();

  mainWindow.loadURL(rendererBaseUrl).catch((err) => {
    console.error(`No se pudo cargar ${rendererBaseUrl}:`, err);
    app.quit();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    apiBaseUrl = await iniciarBackend();
  } catch (err) {
    dialog.showErrorBox(
      "Cotizador — no se pudo iniciar la base de datos local",
      String(err),
    );
    app.quit();
    return;
  }

  rendererBaseUrl = await resolveRendererBaseUrl();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  servidorApi?.close();
  servidorRenderer?.close();
});

app.on("render-process-gone", (_event, _webContents, details) => {
  console.error("Proceso de renderizado terminado:", details.reason);
  app.quit();
});

process.on("uncaughtException", (err) => {
  console.error("Error no capturado:", err);
  app.quit();
});

ipcMain.handle("ping", async () => "pong");

interface GenerarPdfPayload {
  tipo: string;
  proyectoId: string;
  nombreSugerido?: string;
}

/** Genera un PDF offline: ventana oculta con la vista de impresión + printToPDF + diálogo de guardado. */
ipcMain.handle("generar-pdf", async (_event, payload: GenerarPdfPayload) => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true },
  });

  try {
    await ventana.loadURL(resolveImprimirUrl(payload.tipo, payload.proyectoId));
    await esperarListoParaImprimir(ventana);

    const pdfBuffer = await ventana.webContents.printToPDF({});

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Guardar documento",
      defaultPath: `${payload.nombreSugerido ?? payload.tipo}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, mensaje: "Cancelado" };

    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, ruta: filePath };
  } catch (err) {
    return { ok: false, mensaje: String(err) };
  } finally {
    ventana.destroy();
  }
});

/** Abre un archivo con la aplicación predeterminada del SO (fichas técnicas, horas sol, etc.). */
ipcMain.handle("abrir-archivo", async (_event, ruta: string) => {
  const error = await shell.openPath(ruta);
  return { ok: error === "", mensaje: error || undefined };
});
