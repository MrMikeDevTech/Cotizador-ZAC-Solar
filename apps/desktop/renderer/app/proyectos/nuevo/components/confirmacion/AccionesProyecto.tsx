'use client';

import React from 'react';
import Card from './Card';

interface AccionesProyectoProps {
  onAnterior?: () => void;
  onFinalizar?: () => void;
  onDescargarCotizacion?: () => void;
}

export default function AccionesProyecto({
  onAnterior,
  onFinalizar,
  onDescargarCotizacion,
}: AccionesProyectoProps) {
  const handleDescargar = () => {
    if (onDescargarCotizacion) {
      onDescargarCotizacion();
    } else {
      alert('Generando y descargando cotización...');
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
                onClick={() => alert('Borrador guardado exitosamente.')}
                className="w-full border border-[#2dd4bf] text-[#2dd4bf] py-2 rounded-full font-semibold text-xs hover:bg-teal-50 transition-colors cursor-pointer"
              >
                Guardar como borrador
              </button>
            </div>

            <div className="flex flex-col justify-between p-3 bg-gray-50/70 rounded-xl border border-gray-100">
              <div>
                <h4 className="font-bold text-xs md:text-sm text-gray-800 mb-1">Tarea</h4>
                <p className="text-[11px] text-gray-500 mb-3">
                  Asigna una tarea al proyecto y así no olvidarás tus pendientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert('Modal de agregar tarea.')}
                className="w-full border border-[#2dd4bf] text-[#2dd4bf] py-2 rounded-full font-semibold text-xs hover:bg-teal-50 transition-colors cursor-pointer"
              >
                Agregar Tarea
              </button>
            </div>
          </div>
        </Card>

        <Card title="Descargar documentos">
          <ul className="space-y-2.5 text-xs md:text-sm text-[#2dd4bf] underline">
            <li>
              <button
                type="button"
                onClick={() => alert('Descargando actualización de suministrador...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Actualizar Suministrador
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => alert('Generando contrato...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Generar Contrato
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => alert('Obteniendo carta poder...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Obtener carta poder
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => alert('Descargando ficha técnica del panel...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Descargar ficha técnica del panel
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => alert('Descargando ficha técnica del inversor...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Descargar ficha técnica del Inversor
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => alert('Descargando horas sol de la localidad...')}
                className="hover:text-teal-600 text-left transition-colors cursor-pointer"
              >
                Descargar horas sol de la localidad
              </button>
            </li>
          </ul>
        </Card>
      </div>

      {/* 2. BOTÓN PRINCIPAL DE DESCARGA */}
      <div className="flex flex-col items-center justify-center pt-4 pb-4 gap-4">
        <button
          type="button"
          onClick={handleDescargar}
          className="bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-sm md:text-base px-8 md:px-12 py-3.5 md:py-4 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
          </svg>
          Descargar cotización
        </button>
      </div>

      {/* 3. NAVEGACIÓN INFERIOR WIZARD */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onAnterior}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          Regresar a Otros cargos
        </button>
        <button
          type="button"
          onClick={onFinalizar || (() => alert('Proyecto creado con éxito'))}
          className="bg-[#8cc63f] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-green-600 transition-colors cursor-pointer"
        >
          Crear Proyecto
        </button>
      </div>
    </div>
  );
}
