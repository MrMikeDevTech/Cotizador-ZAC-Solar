'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Icono } from '../../../../components/Icono';
import Card from './Card';
import { ApiError, api } from '../../../../../lib/api';
import { descargarBlob } from '../../../../../lib/descargarBlob';

interface AccionesProyectoProps {
  proyectoId?: string;
  panelClave?: string;
  inversorClave?: string;
  nombreProyecto?: string;
  guardando?: boolean;
  errorGuardado?: string | null;
  onAnterior?: () => void;
  onGuardarBorrador?: () => void;
  onFinalizar?: () => void;
  onDescargarCotizacion?: () => void;
}

type TipoDocumento = 'cotizacion' | 'contrato' | 'carta-poder' | 'ficha_panel' | 'ficha_inversor' | 'horas_sol';

export default function AccionesProyecto({
  proyectoId,
  panelClave,
  inversorClave,
  nombreProyecto,
  guardando = false,
  errorGuardado = null,
  onAnterior,
  onGuardarBorrador,
  onFinalizar,
  onDescargarCotizacion,
}: AccionesProyectoProps) {
  const [mensajeDocumento, setMensajeDocumento] = useState<string | null>(null);
  const [generando, setGenerando] = useState<string | null>(null);
  const [mostrarFormTarea, setMostrarFormTarea] = useState(false);
  const [tituloTarea, setTituloTarea] = useState('');
  const [fechaTarea, setFechaTarea] = useState('');
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [tareaGuardada, setTareaGuardada] = useState(false);

  const handleGuardarBorrador = () => {
    if (onGuardarBorrador) {
      onGuardarBorrador();
    } else {
      setMensajeDocumento('Guarda el proyecto al menos una vez para poder crear un borrador.');
    }
  };

  const handleAgregarTarea = async () => {
    if (!proyectoId) {
      setMensajeDocumento('Guarda el proyecto antes de asignarle una tarea.');
      return;
    }
    if (!tituloTarea.trim()) return;

    setGuardandoTarea(true);
    try {
      await api.post('/api/tareas', {
        proyectoId,
        titulo: tituloTarea,
        fechaVencimiento: fechaTarea ? new Date(fechaTarea).toISOString() : undefined,
      });
      setTituloTarea('');
      setFechaTarea('');
      setMostrarFormTarea(false);
      setTareaGuardada(true);
      setTimeout(() => setTareaGuardada(false), 3000);
    } catch {
      setMensajeDocumento('No se pudo guardar la tarea.');
    } finally {
      setGuardandoTarea(false);
    }
  };

  /**
   * PDF de la cotización/documento. Siempre acaba en un archivo guardado:
   * nunca en el diálogo de impresión.
   *
   * - En Electron (`window.api.generarPdf` existe): el proceso principal
   *   renderiza con `printToPDF()`, pregunta dónde guardar y registra el
   *   documento en `/api/documentos`, que es lo que corresponde en una app
   *   de escritorio.
   * - En el navegador no hay acceso a ese IPC, así que el PDF lo genera el
   *   backend (`GET /api/documentos/pdf/:tipo/:proyectoId`) y aquí sólo se
   *   dispara la descarga del blob. El navegador no puede producir un PDF
   *   por su cuenta —`window.print()` es lo único que ofrece, y obliga al
   *   usuario a elegir "Guardar como PDF"—, por eso el render vive en el
   *   servidor: en la app instalada lo hace el Chromium de Electron y en
   *   desarrollo el del sistema.
   */
  const generarPdf = async (tipo: TipoDocumento, nombreSugerido: string) => {
    if (!proyectoId) {
      setMensajeDocumento('Guarda el proyecto antes de generar este documento.');
      return;
    }

    setGenerando(tipo);
    setMensajeDocumento(null);
    try {
      if (!window.api?.generarPdf) {
        const { blob, nombreArchivo } = await api.descargar(
          `/api/documentos/pdf/${tipo}/${proyectoId}`
        );
        descargarBlob(blob, nombreArchivo ?? `${nombreSugerido}.pdf`);
        setMensajeDocumento('Descarga iniciada.');
        return;
      }

      const resultado = await window.api.generarPdf({ tipo, proyectoId, nombreSugerido });
      if (resultado.ok && resultado.ruta) {
        await api.post(`/api/documentos/proyectos/${proyectoId}/${tipo}`, {
          nombreArchivo: nombreSugerido,
          ruta: resultado.ruta,
        });
        setMensajeDocumento(`Documento guardado en ${resultado.ruta}`);
      } else if (resultado.mensaje !== 'Cancelado') {
        setMensajeDocumento(resultado.mensaje ?? 'No se pudo generar el documento.');
      }
    } catch (error) {
      // El backend explica por qué falló (sin Chromium, proyecto sin
      // cotización vigente…); repetirlo es más útil que un texto genérico.
      setMensajeDocumento(
        error instanceof ApiError ? error.message : 'No se pudo generar el documento.'
      );
    } finally {
      setGenerando(null);
    }
  };

  /** Fichas técnicas: se abren si ya existe una plantilla cargada en Configuración → Catálogo. */
  const abrirPlantilla = async (tipo: 'ficha_panel' | 'ficha_inversor', referenciaId: string | undefined) => {
    if (!referenciaId) {
      setMensajeDocumento(`Selecciona ${tipo === 'ficha_inversor' ? 'un inversor' : 'un panel'} en el Paso 3 primero.`);
      return;
    }
    setGenerando(tipo);
    setMensajeDocumento(null);
    try {
      const plantillas = await api.get<Array<{ rutaArchivo: string }>>(
        `/api/documentos/plantillas?tipo=${tipo}&referenciaId=${referenciaId}`
      );
      if (plantillas.length === 0) {
        setMensajeDocumento('No hay ficha técnica cargada. Súbela desde Configuración → Catálogo.');
        return;
      }
      if (window.api?.abrirArchivo) {
        await window.api.abrirArchivo(plantillas[0]!.rutaArchivo);
      } else {
        setMensajeDocumento('Abrir archivos solo está disponible en la app de escritorio.');
      }
    } catch {
      setMensajeDocumento('No se pudo consultar la plantilla.');
    } finally {
      setGenerando(null);
    }
  };

  const abrirHorasSol = async () => {
    setGenerando('horas_sol');
    setMensajeDocumento(null);
    try {
      const plantillas = await api.get<Array<{ rutaArchivo: string }>>('/api/documentos/plantillas?tipo=horas_sol');
      if (plantillas.length === 0) {
        setMensajeDocumento('No hay archivo de horas sol cargado. Súbelo desde Configuración → Catálogo.');
        return;
      }
      if (window.api?.abrirArchivo) {
        await window.api.abrirArchivo(plantillas[0]!.rutaArchivo);
      } else {
        setMensajeDocumento('Abrir archivos solo está disponible en la app de escritorio.');
      }
    } catch {
      setMensajeDocumento('No se pudo consultar la plantilla.');
    } finally {
      setGenerando(null);
    }
  };

  const handleDescargar = () => {
    if (onDescargarCotizacion) {
      onDescargarCotizacion();
    } else {
      generarPdf('cotizacion', `cotizacion-${nombreProyecto ?? 'proyecto'}`);
    }
  };

  return (
    <div className="space-y-8 pt-2">
      {/* 1. ZONA DE DOCUMENTOS Y PROYECTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Proyecto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col justify-between p-3 bg-gray-50/70 rounded-xl border border-gray-100">
              <div>
                <h4 className="font-bold text-xs md:text-sm text-gray-800 mb-1">Borrador</h4>
                <p className="text-[11px] text-gray-500 mb-3">
                  Puedes guardar un borrador y terminarlo después.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGuardarBorrador}
                disabled={guardando}
                className="w-full border border-[#2dd4bf] text-[#2dd4bf] py-2 rounded-full font-semibold text-xs hover:bg-teal-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? 'Guardando…' : 'Guardar como borrador'}
              </button>
            </div>

            <div className="flex flex-col justify-between p-3 bg-gray-50/70 rounded-xl border border-gray-100">
              <div>
                <h4 className="font-bold text-xs md:text-sm text-gray-800 mb-1">Tarea</h4>
                {mostrarFormTarea ? (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Título de la tarea"
                      value={tituloTarea}
                      onChange={(e) => setTituloTarea(e.target.value)}
                      className="w-full border-b border-gray-300 py-1 text-xs bg-transparent focus:outline-none focus:border-[#00388d]"
                    />
                    <input
                      type="date"
                      value={fechaTarea}
                      onChange={(e) => setFechaTarea(e.target.value)}
                      className="w-full border-b border-gray-300 py-1 text-xs bg-transparent focus:outline-none focus:border-[#00388d]"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 mb-3">
                    {tareaGuardada ? 'Tarea guardada.' : 'Asigna una tarea al proyecto y así no olvidarás tus pendientes.'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={mostrarFormTarea ? handleAgregarTarea : () => setMostrarFormTarea(true)}
                disabled={guardandoTarea}
                className="w-full border border-[#2dd4bf] text-[#2dd4bf] py-2 rounded-full font-semibold text-xs hover:bg-teal-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardandoTarea ? 'Guardando…' : mostrarFormTarea ? 'Guardar tarea' : 'Agregar Tarea'}
              </button>
            </div>
          </div>
        </Card>

        <Card title="Descargar documentos">
          <ul className="space-y-2.5 text-xs md:text-sm text-[#2dd4bf] underline">
            <li>
              <button
                type="button"
                onClick={() => generarPdf('contrato', `contrato-${nombreProyecto ?? 'proyecto'}`)}
                disabled={generando === 'contrato'}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                {generando === 'contrato' ? 'Generando…' : 'Generar Contrato'}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => generarPdf('carta-poder', `carta-poder-${nombreProyecto ?? 'proyecto'}`)}
                disabled={generando === 'carta-poder'}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                {generando === 'carta-poder' ? 'Generando…' : 'Obtener carta poder'}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => abrirPlantilla('ficha_panel', panelClave)}
                disabled={generando === 'ficha_panel'}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                Descargar ficha técnica del panel
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => abrirPlantilla('ficha_inversor', inversorClave)}
                disabled={generando === 'ficha_inversor'}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                Descargar ficha técnica del Inversor
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={abrirHorasSol}
                disabled={generando === 'horas_sol'}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                Descargar horas sol de la localidad
              </button>
            </li>
          </ul>
          {mensajeDocumento && (
            <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-50 no-underline">{mensajeDocumento}</p>
          )}
        </Card>
      </div>

      {/* 2. BOTÓN PRINCIPAL DE DESCARGA */}
      <div className="flex flex-col items-center justify-center pt-4 pb-4 gap-4">
        <button
          type="button"
          onClick={handleDescargar}
          disabled={generando === 'cotizacion'}
          className="bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-sm md:text-base px-8 md:px-12 py-3.5 md:py-4 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer disabled:opacity-50"
        >
          <Icono icon={Download} size={20} />
          {generando === 'cotizacion' ? 'Generando…' : 'Descargar cotización'}
        </button>
      </div>

      {/* 3. NAVEGACIÓN INFERIOR WIZARD */}
      <div className="flex flex-col items-end gap-2 pt-6 border-t border-gray-100">
        {errorGuardado && (
          <p className="text-xs text-red-500 font-medium w-full text-right">{errorGuardado}</p>
        )}
        <div className="flex justify-between items-center w-full">
          <button
            type="button"
            onClick={onAnterior}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            Regresar a Otros cargos
          </button>
          <button
            type="button"
            onClick={onFinalizar}
            disabled={guardando}
            className="bg-[#8cc63f] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando
              ? 'Guardando…'
              : proyectoId
                ? 'Guardar Proyecto'
                : 'Crear Proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}
