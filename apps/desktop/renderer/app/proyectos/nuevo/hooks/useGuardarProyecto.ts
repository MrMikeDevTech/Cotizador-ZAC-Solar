'use client';

import { useState } from 'react';
import type { GuardarProyectoPayload, EstatusProyecto } from '@cotizador/shared';
import { api } from '../../../../lib/api';
import type {
  DatosContacto,
  ConsumoPeriodo,
  MetodoPrecio,
  TipoMoneda,
  CargoEditable,
  ConceptoCotizacion,
} from '../types';

export interface DatosParaGuardar {
  datosContacto: DatosContacto;
  nombreProyecto: string;
  localidadConsumo: string;
  hilos: string;
  nombreRecibo: string;
  numeroServicio: string;
  ivaCFE: number;
  porcentajeDap: string;
  usarNuevaTarifa: boolean;
  tarifaSeleccionada: string;
  aplicarDac: boolean;
  aplicarDap: boolean;
  fechaInicio: string;
  periodo: string;
  consumos: ConsumoPeriodo[];
  panelKey: string;
  cantPaneles: number | '';
  inversorKey: string;
  cantInversores: number | '';
  estructuraSeleccionadaId: string | null;
  metodoPrecio: MetodoPrecio;
  incluirIva: boolean;
  tipoMoneda: TipoMoneda;
  valorDolar: number;
  ocultarDesglose: boolean;
  descuento5: boolean;
  descuento10: boolean;
  cargosEditables: CargoEditable[];
  conceptos: ConceptoCotizacion[];
  pasoActual: number;
}

function construirPayload(datos: DatosParaGuardar, estatus: EstatusProyecto): GuardarProyectoPayload {
  return {
    datosContacto: datos.datosContacto,
    datosProyecto: {
      nombreProyecto: datos.nombreProyecto,
      localidadConsumo: datos.localidadConsumo,
      hilos: datos.hilos,
      nombreRecibo: datos.nombreRecibo,
      numeroServicio: datos.numeroServicio,
      ivaCFE: datos.ivaCFE,
      porcentajeDap: datos.porcentajeDap,
      usarNuevaTarifa: datos.usarNuevaTarifa,
      tarifaSeleccionada: datos.tarifaSeleccionada,
      aplicarDac: datos.aplicarDac,
      aplicarDap: datos.aplicarDap,
      fechaInicio: datos.fechaInicio,
      periodo: datos.periodo,
      consumos: datos.consumos,
    },
    equipo: {
      panelClave: datos.panelKey,
      cantPaneles: Number(datos.cantPaneles) || 0,
      inversorClave: datos.inversorKey,
      cantInversores: Number(datos.cantInversores) || 0,
    },
    otrosCargos: {
      estructuraId: datos.estructuraSeleccionadaId,
      metodoPrecio: datos.metodoPrecio,
      incluirIva: datos.incluirIva,
      tipoMoneda: datos.tipoMoneda,
      valorDolar: datos.valorDolar,
      ocultarDesglose: datos.ocultarDesglose,
      descuento5: datos.descuento5,
      descuento10: datos.descuento10,
      cargosEditables: datos.cargosEditables,
      conceptos: datos.conceptos,
    },
    estatus,
    pasoActual: datos.pasoActual,
  };
}

export function useGuardarProyecto(proyectoIdInicial?: string) {
  const [proyectoId, setProyectoId] = useState<string | undefined>(proyectoIdInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(datos: DatosParaGuardar, estatus: EstatusProyecto): Promise<any> {
    setGuardando(true);
    setError(null);
    try {
      const payload = construirPayload(datos, estatus);
      const proyecto = proyectoId
        ? await api.put<any>(`/api/proyectos/${proyectoId}`, payload)
        : await api.post<any>('/api/proyectos', payload);
      setProyectoId(proyecto.id);
      return proyecto;
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el proyecto');
      throw err;
    } finally {
      setGuardando(false);
    }
  }

  return { proyectoId, setProyectoId, guardando, error, guardar };
}
