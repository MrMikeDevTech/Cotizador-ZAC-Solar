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
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
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

async function peticion<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${resolverBaseUrl()}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones?.headers },
  });

  if (!respuesta.ok) {
    let cuerpo: any = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      // sin cuerpo JSON
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

export const api = {
  get: <T>(ruta: string) => peticion<T>(ruta),
  post: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(ruta: string, body: unknown) => peticion<T>(ruta, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(ruta: string) => peticion<T>(ruta, { method: 'DELETE' }),
};
