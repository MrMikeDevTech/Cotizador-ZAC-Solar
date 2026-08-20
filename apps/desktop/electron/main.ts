import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Renderer de Next.js (export estático)
//   - En desarrollo con "next dev": cargar desde ELECTRON_RENDERER_URL (ej. http://localhost:3000)
//   - En producción/carpeta: cargar apps/desktop/renderer/out/index.html
// ---------------------------------------------------------------------------

function resolveRendererPath(): string {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) return devUrl;

  const outDir = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "renderer", "out")
    : path.join(__dirname, "..", "renderer", "out");

  const indexPath = path.join(outDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Cotizador — falta el frontend",
      `No se encontró el export estático del renderer en:\n\n${indexPath}\n\n` +
        "Ejecuta primero:\n  bun run build:renderer",
    );
    app.quit();
    throw new Error("Renderer static export not found");
  }
  return indexPath;
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
      preload: path.join(__dirname, "preload.ts"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.maximize();

  const rendererPath = resolveRendererPath();
  const isDevUrl = rendererPath.startsWith("http");

  (isDevUrl
    ? mainWindow.loadURL(rendererPath)
    : mainWindow.loadFile(rendererPath)
  ).catch((err) => {
    console.error(`No se pudo cargar ${rendererPath}:`, err);
    app.quit();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

app.on("render-process-gone", (_event, _webContents, details) => {
  console.error("Proceso de renderizado terminado:", details.reason);
  app.quit();
});

process.on("uncaughtException", (err) => {
  console.error("Error no capturado:", err);
  app.quit();
});

ipcMain.handle("ping", async () => "pong");