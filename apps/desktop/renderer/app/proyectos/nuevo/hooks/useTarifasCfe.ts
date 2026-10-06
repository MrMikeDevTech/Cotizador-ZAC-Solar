'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EscalonTarifa } from '@cotizador/shared';
import { api } from '../../../../lib/api';
import type { ConsumoPeriodo } from '../types';

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Convierte "marzo 2026" (formato que genera Paso2Consumo) en `{ year, month }`. */
export function parsearPeriodo(inicioStr: string): { year: number; month: number } | null {
  const partes = inicioStr.trim().toLowerCase().split(/\s+/);
  if (partes.length !== 2) return null;

  const mesIndice = MESES_ES.indexOf(partes[0]!);
  const year = Number(partes[1]);
  if (mesIndice === -1 || !Number.isFinite(year) || year <= 0) return null;

  return { year, month: mesIndice + 1 };
}

interface LocalidadApi {
  id: string;
  estado: string;
  nombre: string;
}

interface PeriodoAplicableApi {
  year: number;
  month: number;
  escalones?: EscalonTarifa[];
  disponible: boolean;
}

interface RespuestaAplicables {
  periodos: PeriodoAplicableApi[];
}

export interface ResultadoTarifasCfe {
  /** Escalones por periodo, alineados por índice con `consumos`. `null` = sin tarifa real para ese periodo. */
  escalonesPorPeriodo: Array<EscalonTarifa[] | null>;
  /**
   * `false` cuando falta algún escalón real (incluye: localidad no
   * resuelta, periodos sin capturar, tarifa sin escalonamiento como DAC, o
   * que el backend simplemente no tenga ese mes todavía). El wizard sigue
   * funcionando con el respaldo offline; esta bandera solo dice si el
   * número mostrado es exacto o aproximado.
   */
  completo: boolean;
  cargando: boolean;
}

const SIN_DATOS = (totalPeriodos: number): Pick<ResultadoTarifasCfe, 'escalonesPorPeriodo' | 'completo'> => ({
  escalonesPorPeriodo: Array(totalPeriodos).fill(null),
  completo: false,
});

/**
 * Resuelve las tarifas reales de CFE aplicables a los periodos capturados en
 * el Paso 2, contra `GET /api/cfe-rates/aplicables`. Necesita el `id` de la
 * localidad (no el texto "Estado - Nombre" que guarda el wizard), así que
 * primero lo busca en `/api/config` → `localidades`.
 *
 * Nunca lanza ni rompe el wizard: cualquier dato faltante (localidad sin
 * resolver, periodo sin capturar, tarifa sin escalones publicados como DAC,
 * backend caído) degrada a `completo: false` para que la UI muestre el
 * aviso de "cálculo aproximado" y siga con el respaldo offline.
 */
export function useTarifasCfe(
  consumos: ConsumoPeriodo[],
  localidadConsumo: string,
  tarifaSeleccionada: string
): ResultadoTarifasCfe {
  const [localidades, setLocalidades] = useState<LocalidadApi[] | null>(null);

  useEffect(() => {
    api
      .get<{ localidades: LocalidadApi[] }>('/api/config')
      .then((datos) => setLocalidades(datos.localidades ?? []))
      .catch(() => setLocalidades([]));
  }, []);

  const localidadId = useMemo(() => {
    if (!localidades) return null;
    const encontrada = localidades.find((l) => `${l.estado} - ${l.nombre}` === localidadConsumo);
    return encontrada?.id ?? null;
  }, [localidades, localidadConsumo]);

  const periodos = useMemo(() => consumos.map((c) => parsearPeriodo(c.inicioStr)), [consumos]);
  const periodosClave = useMemo(() => JSON.stringify(periodos), [periodos]);
  const totalPeriodos = consumos.length;

  const [resultado, setResultado] = useState<ResultadoTarifasCfe>({
    ...SIN_DATOS(totalPeriodos),
    cargando: false,
  });

  useEffect(() => {
    // Localidades todavía cargando: espera antes de resolver como "sin datos".
    if (localidades === null) return;

    const periodosValidos = periodos.filter((p): p is { year: number; month: number } => p !== null);

    if (!localidadId || periodosValidos.length !== periodos.length || periodosValidos.length === 0) {
      setResultado({ ...SIN_DATOS(totalPeriodos), cargando: false });
      return;
    }

    let cancelado = false;
    setResultado((prev) => ({ ...prev, cargando: true }));

    const query =
      `tarifa=${encodeURIComponent(tarifaSeleccionada)}` +
      `&localidadId=${encodeURIComponent(localidadId)}` +
      `&periodos=${encodeURIComponent(JSON.stringify(periodosValidos))}`;

    api
      .get<RespuestaAplicables>(`/api/cfe-rates/aplicables?${query}`)
      .then((datos) => {
        if (cancelado) return;

        // Alineado por índice con `consumos`: los periodos sin fecha válida
        // ya se descartaron arriba (y forzaron el camino "sin datos"), así
        // que aquí `datos.periodos` conserva el mismo orden/longitud.
        const escalonesPorPeriodo = datos.periodos.map((p) =>
          p.disponible && Array.isArray(p.escalones) && p.escalones.length > 0 ? p.escalones : null
        );
        const completo = escalonesPorPeriodo.every((e) => e !== null) && escalonesPorPeriodo.length === totalPeriodos;

        setResultado({ escalonesPorPeriodo, completo, cargando: false });
      })
      .catch(() => {
        if (cancelado) return;
        setResultado({ ...SIN_DATOS(totalPeriodos), cargando: false });
      });

    return () => {
      cancelado = true;
    };
    // `periodos` se resume en `periodosClave` para no re-disparar por una
    // nueva identidad de arreglo con el mismo contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localidades, localidadId, periodosClave, tarifaSeleccionada, totalPeriodos]);

  return resultado;
}
