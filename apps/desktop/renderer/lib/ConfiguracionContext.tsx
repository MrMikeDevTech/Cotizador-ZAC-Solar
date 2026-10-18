'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { PanelData, InversorData, EstructuraInstalacion, ConceptoCotizacion, DatosEmpresa } from '../app/proyectos/nuevo/types';
import type { FactoresCalculo } from '@cotizador/shared';
import {
  panelesData as panelesDefecto,
  inversoresData as inversoresDefecto,
  LISTA_ESTRUCTURAS as estructurasDefecto,
  CONCEPTOS_COTIZACION_DEFECTO as conceptosDefecto,
} from '../app/proyectos/nuevo/constants';
import { FACTORES_CALCULO_DEFECTO as factoresDefecto, TARIFAS_INICIALES as tarifasDefecto } from '@cotizador/shared';
import { api } from './api';
import { useSesion } from './SesionContext';

/** Localidad del catálogo: alimenta los selectores de estado y municipio. */
export interface LocalidadConfig {
  id: string;
  estado: string;
  nombre: string;
}

export interface TarifaConfig {
  codigo: string;
  limiteDac: number | null;
}

interface ValorConfiguracion {
  paneles: Record<string, PanelData>;
  inversores: Record<string, InversorData>;
  estructuras: EstructuraInstalacion[];
  conceptosDefecto: ConceptoCotizacion[];
  /**
   * `null` mientras no se capturen los datos en Configuración → Formato de
   * Cotización. No se rellena con un ejemplo: una cotización a nombre de una
   * empresa inventada acaba en manos del cliente.
   */
  empresa: DatosEmpresa | null;
  factores: FactoresCalculo;
  tarifas: TarifaConfig[];
  localidades: LocalidadConfig[];
  conectado: boolean;
  cargando: boolean;
  refrescar: () => Promise<void>;
  invalidar: () => void;
}

const ConfiguracionContext = createContext<ValorConfiguracion>({
  paneles: panelesDefecto,
  inversores: inversoresDefecto,
  estructuras: estructurasDefecto,
  conceptosDefecto,
  empresa: null,
  factores: factoresDefecto,
  tarifas: tarifasDefecto,
  localidades: [],
  conectado: false,
  cargando: true,
  refrescar: async () => {},
  invalidar: () => {},
});

interface PanelApi { id: string; clave: string; nombre: string; watts: number; factorBifacial: number; precioUnitario: number; }
interface InversorApi { id: string; clave: string; nombre: string; wattsMax: number; precioUnitario: number; }
interface EstructuraApi { id: string; nombre: string; precio: number; }
interface ConceptoApi { id: string; concepto: string; costoBase: number; margenPorcentaje: number; }

interface RespuestaConfig {
  // Huella de cambios que el backend incrementa en cada mutación de config.
  // Es opcional porque este frontend debe seguir funcionando aunque el
  // backend todavía no la incluya (se revalida igual en ese caso).
  version?: string | number;
  empresa: (DatosEmpresa & { id: string }) | null;
  factores: (FactoresCalculo & { id: string }) | null;
  paneles: PanelApi[];
  inversores: InversorApi[];
  estructuras: EstructuraApi[];
  conceptos: ConceptoApi[];
  tarifas: TarifaConfig[];
  localidades: LocalidadConfig[];
}

/** Antirrebote: no se revalida si la última carga terminó hace menos de esto. */
const VENTANA_ANTIRREBOTE_MS = 2000;

export function ConfiguracionProvider({ children }: { children: ReactNode }) {
  // `/api/config` exige sesión. Este provider envuelve toda la app (incluida la
  // pantalla de login), así que sin consultar la sesión antes dispararía un 401
  // garantizado en cada arranque en frío — y ese 401, al pasar por `lib/api.ts`,
  // borra el token y limpia la sesión, de modo que el propio provider echaba
  // fuera a quien acabara de entrar.
  const { usuario, cargando: cargandoSesion } = useSesion();

  const [estado, setEstado] = useState<Omit<ValorConfiguracion, 'refrescar' | 'invalidar'>>({
    paneles: panelesDefecto,
    inversores: inversoresDefecto,
    estructuras: estructurasDefecto,
    conceptosDefecto,
    empresa: null,
    factores: factoresDefecto,
    tarifas: tarifasDefecto,
    localidades: [],
    conectado: false,
    cargando: true,
  });

  // Última `version` aplicada. `null` = todavía no se cargó nada, o el
  // backend no manda el campo (en cuyo caso nunca coincide y siempre se
  // aplica la respuesta).
  const versionRef = useRef<string | number | null>(null);
  const ultimaRevalidacionRef = useRef(0);
  const montadoRef = useRef(false);

  const cargarConfig = useCallback(
    async (opciones: { mostrarCargando: boolean; ignorarAntirrebote: boolean }) => {
      const ahora = Date.now();
      if (!opciones.ignorarAntirrebote && ahora - ultimaRevalidacionRef.current < VENTANA_ANTIRREBOTE_MS) {
        return;
      }
      ultimaRevalidacionRef.current = ahora;

      if (opciones.mostrarCargando) {
        setEstado((prev) => ({ ...prev, cargando: true }));
      }

      try {
        const datos = await api.get<RespuestaConfig>('/api/config');

        // Si el backend ya manda `version` y coincide con la última que
        // aplicamos, no hay nada nuevo: se evita el `setEstado` para no
        // provocar renders (y recálculos de cotizaciones en curso) sin motivo.
        if (datos.version !== undefined && versionRef.current !== null && datos.version === versionRef.current) {
          if (opciones.mostrarCargando) {
            setEstado((prev) => ({ ...prev, conectado: true, cargando: false }));
          }
          return;
        }
        versionRef.current = datos.version ?? null;

        // Se conserva `precioUnitario` (y `clave`): sin el precio no se puede
        // recomendar equipo ni cotizarlo con el catálogo real.
        const paneles: Record<string, PanelData> = {};
        for (const p of datos.paneles) {
          paneles[p.clave] = {
            clave: p.clave,
            nombre: p.nombre,
            watts: p.watts,
            factorBifacial: p.factorBifacial,
            precioUnitario: p.precioUnitario,
          };
        }

        const inversores: Record<string, InversorData> = {};
        for (const inv of datos.inversores) {
          inversores[inv.clave] = {
            clave: inv.clave,
            nombre: inv.nombre,
            wattsMax: inv.wattsMax,
            precioUnitario: inv.precioUnitario,
          };
        }

        const estructuras: EstructuraInstalacion[] = datos.estructuras.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          precio: e.precio,
        }));

        const conceptosCargados: ConceptoCotizacion[] = datos.conceptos.map((c) => ({
          id: c.id,
          concepto: c.concepto,
          costoBase: c.costoBase,
          margenPorcentaje: c.margenPorcentaje,
        }));

        setEstado({
          paneles: Object.keys(paneles).length ? paneles : panelesDefecto,
          inversores: Object.keys(inversores).length ? inversores : inversoresDefecto,
          estructuras: estructuras.length ? estructuras : estructurasDefecto,
          conceptosDefecto: conceptosCargados.length ? conceptosCargados : conceptosDefecto,
          empresa: datos.empresa,
          factores: datos.factores ?? factoresDefecto,
          tarifas: datos.tarifas.length ? datos.tarifas : tarifasDefecto,
          localidades: datos.localidades ?? [],
          conectado: true,
          cargando: false,
        });
      } catch {
        // Sin backend disponible (o sesión no válida): la UI sigue
        // funcionando con los valores por defecto / los últimos cargados.
        setEstado((prev) => ({ ...prev, conectado: false, cargando: false }));
      }
    },
    []
  );

  /** Refresco de catálogo: lo usan las subpáginas de configuración tras guardar cambios. */
  const refrescar = useCallback(
    () => cargarConfig({ mostrarCargando: true, ignorarAntirrebote: true }),
    [cargarConfig]
  );

  /** Revalidación silenciosa: no togglea `cargando`, para no parpadear la UI. */
  const revalidarSilencioso = useCallback(
    () => cargarConfig({ mostrarCargando: false, ignorarAntirrebote: false }),
    [cargarConfig]
  );

  /**
   * Para llamar tras una mutación propia (p. ej. guardar en /config/catalogo):
   * fuerza que la próxima revalidación se aplique sin importar la `version`
   * ni el antirrebote.
   */
  const invalidar = useCallback(() => {
    versionRef.current = null;
    ultimaRevalidacionRef.current = 0;
  }, []);

  // Carga inicial, en cuanto hay sesión. Al entrar (null -> usuario) este
  // efecto vuelve a correr y trae la configuración; al salir se descarta la
  // `version` para que el siguiente inicio de sesión no reutilice la caché.
  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuario) {
      versionRef.current = null;
      ultimaRevalidacionRef.current = 0;
      setEstado((prev) => ({ ...prev, conectado: false, cargando: false }));
      return;
    }

    cargarConfig({ mostrarCargando: true, ignorarAntirrebote: true });
  }, [usuario, cargandoSesion, cargarConfig]);

  // Revalida al recuperar el foco de la ventana (clic de vuelta a la app, o
  // cambio de pestaña/ventana del sistema operativo).
  useEffect(() => {
    if (!usuario) return;

    const manejarFoco = () => revalidarSilencioso();
    const manejarVisibilidad = () => {
      if (document.visibilityState === 'visible') revalidarSilencioso();
    };
    window.addEventListener('focus', manejarFoco);
    document.addEventListener('visibilitychange', manejarVisibilidad);
    return () => {
      window.removeEventListener('focus', manejarFoco);
      document.removeEventListener('visibilitychange', manejarVisibilidad);
    };
  }, [usuario, revalidarSilencioso]);

  // Revalida al cambiar de ruta (p. ej. volver de /config/catalogo al
  // wizard), salvo en el montaje inicial, que ya dispara su propia carga.
  const pathname = usePathname();
  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      return;
    }
    if (!usuario) return;
    revalidarSilencioso();
  }, [pathname, usuario, revalidarSilencioso]);

  return (
    <ConfiguracionContext.Provider value={{ ...estado, refrescar, invalidar }}>
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  return useContext(ConfiguracionContext);
}
