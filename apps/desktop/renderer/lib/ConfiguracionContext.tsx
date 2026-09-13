'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PanelData, InversorData, EstructuraInstalacion, ConceptoCotizacion, DatosEmpresa } from '../app/proyectos/nuevo/types';
import type { FactoresCalculo } from '@cotizador/shared';
import {
  panelesData as panelesDefecto,
  inversoresData as inversoresDefecto,
  LISTA_ESTRUCTURAS as estructurasDefecto,
  CONCEPTOS_COTIZACION_DEFECTO as conceptosDefecto,
  DATOS_EMPRESA_DEFECTO as empresaDefecto,
} from '../app/proyectos/nuevo/constants';
import { FACTORES_CALCULO_DEFECTO as factoresDefecto, TARIFAS_INICIALES as tarifasDefecto } from '@cotizador/shared';
import { api } from './api';

export interface TarifaConfig {
  codigo: string;
  limiteDac: number | null;
}

interface ValorConfiguracion {
  paneles: Record<string, PanelData>;
  inversores: Record<string, InversorData>;
  estructuras: EstructuraInstalacion[];
  conceptosDefecto: ConceptoCotizacion[];
  empresa: DatosEmpresa;
  factores: FactoresCalculo;
  tarifas: TarifaConfig[];
  conectado: boolean;
  cargando: boolean;
  refrescar: () => Promise<void>;
}

const ConfiguracionContext = createContext<ValorConfiguracion>({
  paneles: panelesDefecto,
  inversores: inversoresDefecto,
  estructuras: estructurasDefecto,
  conceptosDefecto,
  empresa: empresaDefecto,
  factores: factoresDefecto,
  tarifas: tarifasDefecto,
  conectado: false,
  cargando: true,
  refrescar: async () => {},
});

interface PanelApi { id: string; clave: string; nombre: string; watts: number; factorBifacial: number; precioUnitario: number; }
interface InversorApi { id: string; clave: string; nombre: string; wattsMax: number; precioUnitario: number; }
interface EstructuraApi { id: string; nombre: string; precio: number; }
interface ConceptoApi { id: string; concepto: string; costoBase: number; margenPorcentaje: number; }

interface RespuestaConfig {
  empresa: (DatosEmpresa & { id: string }) | null;
  factores: (FactoresCalculo & { id: string }) | null;
  paneles: PanelApi[];
  inversores: InversorApi[];
  estructuras: EstructuraApi[];
  conceptos: ConceptoApi[];
  tarifas: TarifaConfig[];
}

export function ConfiguracionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Omit<ValorConfiguracion, 'refrescar'>>({
    paneles: panelesDefecto,
    inversores: inversoresDefecto,
    estructuras: estructurasDefecto,
    conceptosDefecto,
    empresa: empresaDefecto,
    factores: factoresDefecto,
    tarifas: tarifasDefecto,
    conectado: false,
    cargando: true,
  });

  const refrescar = useCallback(async () => {
    setEstado((prev) => ({ ...prev, cargando: true }));
    try {
      const datos = await api.get<RespuestaConfig>('/api/config');

      const paneles: Record<string, PanelData> = {};
      for (const p of datos.paneles) {
        paneles[p.clave] = { nombre: p.nombre, watts: p.watts, factorBifacial: p.factorBifacial };
      }

      const inversores: Record<string, InversorData> = {};
      for (const inv of datos.inversores) {
        inversores[inv.clave] = { nombre: inv.nombre, wattsMax: inv.wattsMax };
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
        empresa: datos.empresa ?? empresaDefecto,
        factores: datos.factores ?? factoresDefecto,
        tarifas: datos.tarifas.length ? datos.tarifas : tarifasDefecto,
        conectado: true,
        cargando: false,
      });
    } catch {
      // Sin backend disponible: la UI sigue funcionando con los valores por defecto.
      setEstado((prev) => ({ ...prev, conectado: false, cargando: false }));
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return (
    <ConfiguracionContext.Provider value={{ ...estado, refrescar }}>
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  return useContext(ConfiguracionContext);
}
