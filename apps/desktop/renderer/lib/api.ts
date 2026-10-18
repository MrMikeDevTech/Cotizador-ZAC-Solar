export interface GenerarPdfPayload {
  tipo: string;
  proyectoId: string;
  nombreSugerido?: string;
}

export interface GenerarPdfResultado {
  ok: boolean;
  ruta?: string;
  mensaje?: string;
}

declare global {
  interface Window {
    api?: {
      ping: () => Promise<string>;
      apiBaseUrl?: string;
      generarPdf?: (payload: GenerarPdfPayload) => Promise<GenerarPdfResultado>;
      abrirArchivo?: (ruta: string) => Promise<{ ok: boolean; mensaje?: string }>;
    };
  }
}

function resolverBaseUrl(): string {
  if (typeof window !== 'undefined' && window.api?.apiBaseUrl) {
    return window.api.apiBaseUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:28914';
}

export class ApiError extends Error {
  codigo: string;
  status: number;
  detalles?: unknown;

  constructor(codigo: string, mensaje: string, status: number, detalles?: unknown) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
  }
}

/** Clave de localStorage donde se guarda el token de sesión. */
const CLAVE_TOKEN = 'zac-solar.token';

/**
 * Token efímero que el backend pone en la URL al renderizar un PDF
 * (`/documentos/imprimir/?…&render=<token>`). Ese render ocurre en un
 * navegador headless con perfil limpio: no hay `localStorage` que compartir,
 * así que la vista de impresión sólo puede autenticarse con lo que venga en
 * la URL. Lo mintea y lo revoca `GET /api/documentos/pdf/:tipo/:proyectoId`.
 */
function leerTokenDeRender(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('render');
  } catch {
    return null;
  }
}

/** `true` cuando la página se está cargando para generar un PDF. */
export function enContextoDeRender(): boolean {
  return leerTokenDeRender() !== null;
}

export function leerToken(): string | null {
  if (typeof window === 'undefined') return null;
  const deRender = leerTokenDeRender();
  if (deRender) return deRender;
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    // almacenamiento no disponible (p. ej. modo privado); la sesión no persiste
  }
}

export function borrarToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // nada que limpiar si no hay almacenamiento
  }
}

/**
 * Callback que el `lib/api.ts` invoca cuando el backend responde 401. Vive
 * como una simple referencia de función en vez de un import de React: así
 * este módulo no depende de ningún framework de UI y puede usarse desde
 * cualquier contexto. Quien monte la sesión (`SesionContext`) se registra
 * aquí para reaccionar (limpiar estado y dejar que el guard redirija).
 */
let manejadorNoAutorizado: (() => void) | null = null;

export function onNoAutorizado(cb: () => void): void {
  manejadorNoAutorizado = cb;
}

async function peticion<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const token = leerToken();
  const respuesta = await fetch(`${resolverBaseUrl()}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones?.headers,
    },
  });

  if (!respuesta.ok) {
    let cuerpo: any = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      // sin cuerpo JSON
    }

    // En un render no se toca la sesión del usuario: el 401 sería del token
    // efímero de la URL, y borrar `localStorage` aquí dejaría al usuario
    // fuera de la app por haber descargado un PDF.
    if (respuesta.status === 401 && !enContextoDeRender()) {
      borrarToken();
      manejadorNoAutorizado?.();
    }

    throw new ApiError(
      cuerpo?.error?.codigo ?? 'ERROR_DESCONOCIDO',
      cuerpo?.error?.mensaje ?? `Error ${respuesta.status}`,
      respuesta.status,
      cuerpo?.error?.detalles
    );
  }

  if (respuesta.status === 204) return undefined as T;
  return respuesta.json() as Promise<T>;
}

/**
 * Descarga un archivo binario de la API. Devuelve el blob y el nombre que
 * propuso el servidor en `Content-Disposition`, que es quien sabe cómo se
 * debe llamar el documento.
 */
async function descargar(ruta: string): Promise<{ blob: Blob; nombreArchivo: string | null }> {
  const token = leerToken();
  const respuesta = await fetch(`${resolverBaseUrl()}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!respuesta.ok) {
    let cuerpo: any = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      // sin cuerpo JSON
    }
    if (respuesta.status === 401 && !enContextoDeRender()) {
      borrarToken();
      manejadorNoAutorizado?.();
    }
    throw new ApiError(
      cuerpo?.error?.codigo ?? 'ERROR_DESCONOCIDO',
      cuerpo?.error?.mensaje ?? `Error ${respuesta.status}`,
      respuesta.status,
      cuerpo?.error?.detalles
    );
  }

  const disposicion = respuesta.headers.get('Content-Disposition');
  const coincidencia = disposicion?.match(/filename="([^"]+)"/);

  return { blob: await respuesta.blob(), nombreArchivo: coincidencia?.[1] ?? null };
}

export const api = {
  get: <T>(ruta: string) => peticion<T>(ruta),
  descargar,
  post: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(ruta: string) => peticion<T>(ruta, { method: 'DELETE' }),
};
