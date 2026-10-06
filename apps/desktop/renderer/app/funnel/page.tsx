'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, RefreshCw } from 'lucide-react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { api, ApiError } from '../../lib/api';
import { Icono } from '../components/Icono';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrastreActivo, FaseConProyectos, FaseFunnel, ProyectoFunnel } from './types';
import { FunnelHeader, ModalFase, TableroFunnel } from './components';

function obtenerMensajeError(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function FunnelPage() {
  const [fases, setFases] = useState<FaseFunnel[]>([]);
  const [proyectosPorFase, setProyectosPorFase] = useState<Record<string, ProyectoFunnel[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<ArrastreActivo | null>(null);

  const [modalFase, setModalFase] = useState<{ abierto: boolean; fase: FaseFunnel | null }>({
    abierto: false,
    fase: null,
  });
  const [guardandoFase, setGuardandoFase] = useState(false);
  const [faseABorrar, setFaseABorrar] = useState<FaseFunnel | null>(null);

  const cargarTablero = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const datos = await api.get<FaseConProyectos[]>('/api/funnel/tablero');
      setFases(datos.map(({ proyectos, ...fase }) => fase));
      setProyectosPorFase(Object.fromEntries(datos.map((fase) => [fase.id, fase.proyectos])));
      setError(null);
    } catch (err) {
      if (silencioso) {
        toast.error('No se pudo sincronizar el tablero con el servidor.');
      } else {
        setError(obtenerMensajeError(err, 'No se pudo cargar el tablero del funnel.'));
      }
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTablero();
  }, [cargarTablero]);

  // ───────── Fases: crear / renombrar / borrar ─────────

  const abrirModalCrear = () => setModalFase({ abierto: true, fase: null });
  const abrirModalRenombrar = (fase: FaseFunnel) => setModalFase({ abierto: true, fase });
  const cerrarModalFase = () => {
    if (guardandoFase) return;
    setModalFase({ abierto: false, fase: null });
  };

  const guardarFase = async (datos: { nombre: string; color: string }) => {
    setGuardandoFase(true);
    try {
      if (modalFase.fase) {
        await api.put(`/api/funnel/fases/${modalFase.fase.id}`, datos);
        toast.success('Fase actualizada.');
      } else {
        await api.post('/api/funnel/fases', datos);
        toast.success('Fase creada.');
      }
      setModalFase({ abierto: false, fase: null });
      await cargarTablero();
    } catch (err) {
      toast.error(obtenerMensajeError(err, 'No se pudo guardar la fase.'));
    } finally {
      setGuardandoFase(false);
    }
  };

  const confirmarBorrarFase = async () => {
    if (!faseABorrar) return;
    try {
      await api.del(`/api/funnel/fases/${faseABorrar.id}`);
      toast.success('Fase eliminada.');
      setFaseABorrar(null);
      await cargarTablero();
    } catch (err) {
      // 403 (fase de sistema) o 409 (fase con proyectos) llegan con mensaje claro del backend.
      toast.error(obtenerMensajeError(err, 'No se pudo eliminar la fase.'));
    }
  };

  // ───────── Drag & drop ─────────

  const handleDragStart = (event: DragStartEvent) => {
    const tipo = event.active.data.current?.type === 'columna' ? 'columna' : 'tarjeta';
    setArrastre({ id: String(event.active.id), tipo });
  };

  const handleDragCancel = () => setArrastre(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const tipo = active.data.current?.type === 'columna' ? 'columna' : 'tarjeta';
    setArrastre(null);
    if (!over) return;

    if (tipo === 'columna') {
      if (over.data.current?.type !== 'columna' || active.id === over.id) return;

      const anterior = fases;
      const oldIndex = anterior.findIndex((f) => f.id === active.id);
      const newIndex = anterior.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordenadas = arrayMove(anterior, oldIndex, newIndex);
      setFases(reordenadas);

      api.put('/api/funnel/fases/orden', { ids: reordenadas.map((f) => f.id) }).catch((err) => {
        setFases(anterior);
        toast.error(obtenerMensajeError(err, 'No se pudo reordenar las fases. Se revirtió el cambio.'));
      });
      return;
    }

    // Mover/reordenar una tarjeta (proyecto).
    const proyectoId = String(active.id);
    const faseOrigenId = active.data.current?.faseId as string | undefined;
    const faseDestinoId =
      over.data.current?.type === 'tarjeta' || over.data.current?.type === 'columna-area'
        ? (over.data.current?.faseId as string | undefined)
        : undefined;
    if (!faseOrigenId || !faseDestinoId) return;

    const faseDestino = fases.find((f) => f.id === faseDestinoId);
    if (!faseDestino) return;

    const estadoAnterior = proyectosPorFase;
    const listaOrigen = estadoAnterior[faseOrigenId] ?? [];
    const indiceOrigen = listaOrigen.findIndex((p) => p.id === proyectoId);
    if (indiceOrigen === -1) return;

    let nuevoEstado: Record<string, ProyectoFunnel[]>;
    let ordenEnFase: number;

    if (faseOrigenId === faseDestinoId) {
      const indiceDestino =
        over.data.current?.type === 'tarjeta' ? listaOrigen.findIndex((p) => p.id === over.id) : listaOrigen.length - 1;
      if (indiceDestino === -1 || indiceOrigen === indiceDestino) return;

      const reordenada = arrayMove(listaOrigen, indiceOrigen, indiceDestino);
      nuevoEstado = { ...estadoAnterior, [faseOrigenId]: reordenada };
      ordenEnFase = reordenada.findIndex((p) => p.id === proyectoId);
    } else {
      const origenSinItem = [...listaOrigen];
      const [proyectoMovido] = origenSinItem.splice(indiceOrigen, 1);
      if (!proyectoMovido) return;

      const listaDestino = [...(estadoAnterior[faseDestinoId] ?? [])];
      const indiceSobre = over.data.current?.type === 'tarjeta' ? listaDestino.findIndex((p) => p.id === over.id) : -1;
      const posicionFinal = indiceSobre === -1 ? listaDestino.length : indiceSobre;
      listaDestino.splice(posicionFinal, 0, proyectoMovido);

      nuevoEstado = { ...estadoAnterior, [faseOrigenId]: origenSinItem, [faseDestinoId]: listaDestino };
      ordenEnFase = posicionFinal;
    }

    setProyectosPorFase(nuevoEstado);

    api
      .put(`/api/funnel/proyectos/${proyectoId}/mover`, { faseSlug: faseDestino.slug, ordenEnFase })
      .then(() => cargarTablero(true))
      .catch((err) => {
        setProyectosPorFase(estadoAnterior);
        toast.error(obtenerMensajeError(err, 'No se pudo mover el proyecto. Se revirtió el cambio.'));
      });
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <FunnelHeader cargando={cargando} onActualizar={() => cargarTablero()} onNuevaFase={abrirModalCrear} />

        {error ? (
          <div className="bg-white/95 rounded-3xl p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-[#ef4444]">No se pudo cargar el tablero.</p>
            <p className="text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => cargarTablero()}
              className="inline-flex items-center gap-2 bg-[#00388d] text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-blue-900 transition-colors cursor-pointer"
            >
              <Icono icon={RefreshCw} size={14} />
              Reintentar
            </button>
          </div>
        ) : cargando ? (
          <div className="bg-white/95 rounded-3xl p-10 text-center text-sm text-gray-500">Cargando tablero…</div>
        ) : fases.length === 0 ? (
          <div className="bg-white/95 rounded-3xl p-10 text-center space-y-3">
            <p className="text-sm text-gray-500">Todavía no hay fases configuradas.</p>
            <button
              type="button"
              onClick={abrirModalCrear}
              className="inline-flex items-center gap-2 bg-[#f7931e] text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-orange-500 transition-colors cursor-pointer"
            >
              <Icono icon={Plus} size={14} />
              Crear primera fase
            </button>
          </div>
        ) : (
          <TableroFunnel
            fases={fases}
            proyectosPorFase={proyectosPorFase}
            arrastreActivo={arrastre}
            onRenombrarFase={abrirModalRenombrar}
            onBorrarFase={setFaseABorrar}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          />
        )}
      </div>

      <ModalFase
        abierto={modalFase.abierto}
        titulo={modalFase.fase ? 'Renombrar fase' : 'Nueva fase'}
        nombreInicial={modalFase.fase?.nombre}
        colorInicial={modalFase.fase?.color}
        guardando={guardandoFase}
        onCerrar={cerrarModalFase}
        onGuardar={guardarFase}
      />

      <ConfirmDialog
        abierto={faseABorrar !== null}
        onCerrar={() => setFaseABorrar(null)}
        onConfirmar={confirmarBorrarFase}
        titulo="Borrar fase"
        mensaje={`¿Seguro que quieres borrar la fase "${faseABorrar?.nombre ?? ''}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Borrar"
        peligroso
      />
    </div>
  );
}
