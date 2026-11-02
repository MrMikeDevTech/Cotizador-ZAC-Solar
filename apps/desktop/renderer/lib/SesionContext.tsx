'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, guardarToken, leerToken, borrarToken, onNoAutorizado } from './api';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface RespuestaLogin {
  token: string;
  usuario: UsuarioSesion;
}

interface ValorSesion {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  actualizarUsuario: (usuario: UsuarioSesion) => void;
  /** Entra como otro vendedor sin contraseña (laptop compartida). */
  cambiarDeCuenta: (usuarioId: string) => Promise<void>;
  /** Crea un vendedor (rol usuario) y entra como él. */
  agregarVendedor: (nombre: string, email: string) => Promise<void>;
}

const SesionContext = createContext<ValorSesion>({
  usuario: null,
  cargando: true,
  iniciarSesion: async () => {},
  cerrarSesion: async () => {},
  actualizarUsuario: () => {},
  cambiarDeCuenta: async () => {},
  agregarVendedor: async () => {},
});

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  // Evita que el guard dispare un segundo redirect si ya estamos navegando
  // tras un 401 (p. ej. una petición en vuelo que termina después del logout).
  const sesionLimpiadaRef = useRef(false);

  const limpiarSesion = useCallback(() => {
    sesionLimpiadaRef.current = true;
    borrarToken();
    setUsuario(null);
  }, []);

  useEffect(() => {
    onNoAutorizado(() => {
      limpiarSesion();
    });
  }, [limpiarSesion]);

  useEffect(() => {
    const token = leerToken();
    if (!token) {
      setCargando(false);
      return;
    }

    api
      .get<UsuarioSesion>('/api/auth/yo')
      .then((datos) => {
        setUsuario(datos);
      })
      .catch(() => {
        limpiarSesion();
      })
      .finally(() => {
        setCargando(false);
      });
  }, [limpiarSesion]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const respuesta = await api.post<RespuestaLogin>('/api/auth/login', { email, password });
    sesionLimpiadaRef.current = false;
    guardarToken(respuesta.token);
    setUsuario(respuesta.usuario);
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // si la petición falla igual limpiamos la sesión local
    } finally {
      limpiarSesion();
      router.push('/login');
    }
  }, [limpiarSesion, router]);

  const actualizarUsuario = useCallback((datos: UsuarioSesion) => {
    setUsuario(datos);
  }, []);

  /**
   * El backend cierra la sesión anterior y devuelve un token nuevo. Se guarda con
   * `guardarToken` (archivo de Electron o localStorage). Después se recarga la
   * pantalla: catálogos, proyecto abierto y demás estado en memoria son de la
   * cuenta anterior y mezclarlos con la nueva sería peor que perder un borrador.
   */
  const adoptarSesion = useCallback(async (respuesta: RespuestaLogin) => {
    sesionLimpiadaRef.current = false;
    await guardarToken(respuesta.token);
    setUsuario(respuesta.usuario);
    window.location.assign('/');
  }, []);

  const cambiarDeCuenta = useCallback(
    async (usuarioId: string) => {
      await adoptarSesion(await api.post<RespuestaLogin>('/api/auth/cambio-rapido', { usuarioId }));
    },
    [adoptarSesion]
  );

  const agregarVendedor = useCallback(
    async (nombre: string, email: string) => {
      await adoptarSesion(await api.post<RespuestaLogin>('/api/auth/vendedores', { nombre, email }));
    },
    [adoptarSesion]
  );

  return (
    <SesionContext.Provider
      value={{
        usuario,
        cargando,
        iniciarSesion,
        cerrarSesion,
        actualizarUsuario,
        cambiarDeCuenta,
        agregarVendedor,
      }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContext);
}
