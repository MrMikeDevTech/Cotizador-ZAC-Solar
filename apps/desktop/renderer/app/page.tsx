'use client'; 

import { useState } from 'react';
import Link from 'next/link'; // <-- IMPORTANTE: Importamos Link para navegar

// --- DATOS DE EJEMPLO (Vacíos) ---
const datosTareas = {
  'En curso': [],
  'Vencidas': [], 
};

const datosProyectos = {
  'Desarrollo': [],
  'Enviados': [],
  'Vendidos': [],
  'Perdidos': [],
};

export default function Home() {
  const [tabTareaActiva, setTabTareaActiva] = useState<'En curso' | 'Vencidas'>('En curso');
  const [tabProyectoActivo, setTabProyectoActivo] = useState<'Desarrollo' | 'Enviados' | 'Vendidos' | 'Perdidos'>('Desarrollo');

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      

      {/* --- SECCIÓN SUPERIOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center mt-4">
            <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-gray-400 text-sm shadow-md border-4 border-white">
              Logo Zac-Solar
            </div>
            <h2 className="text-3xl font-bold text-white mt-4 tracking-wide drop-shadow-md leading-tight">
              El sol es<br/>nuestro aliado
            </h2>
          </div>

          {/* --- PANEL DE TAREAS --- */}
          <div className="bg-white rounded-3xl shadow-lg p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Tareas</h3>
              <button className="border-2 border-[#00388d] text-[#00388d] px-4 py-1 rounded-full text-xs font-semibold hover:bg-blue-50 transition-colors">
                Nueva Tarea
              </button>
            </div>
            
            <div className="flex gap-4 border-b border-gray-200 text-sm mb-4 shrink-0">
              <button 
                onClick={() => setTabTareaActiva('En curso')}
                className={`pb-2 font-medium ${tabTareaActiva === 'En curso' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                En curso ({datosTareas['En curso'].length})
              </button>
              <button 
                onClick={() => setTabTareaActiva('Vencidas')}
                className={`pb-2 font-medium ${tabTareaActiva === 'Vencidas' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Vencidas({datosTareas['Vencidas'].length})
              </button>
            </div>
            
            <div className="space-y-4 mt-2 h-[220px] overflow-y-auto pr-2">
              {datosTareas[tabTareaActiva].length > 0 ? (
                datosTareas[tabTareaActiva].map((tarea: any) => (
                  <div key={tarea.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3">
                    <div>
                      <p><span className="font-semibold">{tarea.usuario}:</span> {tarea.accion}</p>
                      <p className="text-gray-500 text-xs mt-1">{tarea.fecha}</p>
                    </div>
                    <Link href="#" className="text-blue-600 font-semibold hover:underline">Ver</Link>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-400 italic">No hay tareas en esta sección.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="lg:col-span-8 flex flex-col gap-6 relative z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#fcf8e1] rounded-3xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-[#00388d] mb-8">Actividad</h3>
              <div className="relative h-32 border-l border-b border-gray-400 ml-4 mb-6 mt-2">
                <span className="absolute -left-4 top-0 text-xs text-[#00388d]">1</span>
                <span className="absolute -left-4 bottom-0 text-xs text-[#00388d]">0</span>
                <span className="absolute -bottom-6 left-2 text-[10px] text-gray-600 whitespace-nowrap">Semana Pasada</span>
                <span className="absolute -bottom-6 left-24 text-[10px] text-gray-600 whitespace-nowrap">Semana Actual</span>
              </div>
              <div className="flex gap-4 mt-12 text-xs justify-end">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#8cc63f] block"></span> Registrados</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f7931e] block"></span> Enviados</span>
              </div>
            </div>

            <div className="bg-[#fcf8e1] rounded-3xl shadow-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-[#00388d] mb-4">Contactos</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] mb-6">
                <span className="flex items-center gap-1 text-gray-600"><span className="w-3 h-2 bg-[#8cc63f] block"></span> Primer contacto</span>
                <span className="flex items-center gap-1 text-gray-600"><span className="w-3 h-2 bg-[#4a86e8] block"></span> Contactar en el futuro</span>
                <span className="flex items-center gap-1 text-gray-600"><span className="w-3 h-2 bg-[#bf9000] block"></span> No contesta</span>
                <span className="flex items-center gap-1 text-gray-600"><span className="w-3 h-2 bg-[#999999] block"></span> Solicitud de recibos</span>
                <span className="flex items-center gap-1 col-span-2 text-gray-600"><span className="w-3 h-2 bg-[#b45f06] block"></span> Contrató con otra empresa</span>
              </div>
              <div className="flex-grow flex justify-center items-center mt-2">
                <div className="w-24 h-24 rounded-full border-[3px] border-gray-200"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 flex-1 flex items-start min-h-[12rem]">
            <h3 className="text-lg font-semibold">Tu configuracion</h3>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN INFERIOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* --- PANEL DE PROYECTOS --- */}
        <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col">
          <div className="flex flex-wrap gap-2 justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-semibold">Proyectos</h3>
            <div className="flex gap-2">
              <button className="border border-[#f7931e] text-[#f7931e] px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold hover:bg-orange-50 transition-colors">Cotizacion rapida</button>
              
              {/* AQUÍ ESTÁ EL CAMBIO PRINCIPAL */}
              <Link href="/proyectos/nuevo" className="border border-[#f7931e] text-[#f7931e] px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold hover:bg-orange-50 transition-colors">
                Nuevo Proyecto
              </Link>
            </div>
          </div>
          
          <div className="flex gap-4 border-b border-gray-200 text-xs mb-4 pb-1 shrink-0">
            {(['Desarrollo', 'Enviados', 'Vendidos', 'Perdidos'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setTabProyectoActivo(tab)}
                className={`pb-1 font-semibold ${tabProyectoActivo === tab ? 'text-gray-800 border-b-2 border-[#f7931e]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="space-y-4 mt-2 h-[220px] overflow-y-auto pr-2">
            {datosProyectos[tabProyectoActivo].length > 0 ? (
              datosProyectos[tabProyectoActivo].map((proyecto: any) => (
                <div key={proyecto.id} className="flex justify-between text-xs border-b border-gray-100 pb-3">
                  <div className="w-2/5">
                    <p className="font-semibold text-gray-800 text-sm">{proyecto.nombre}</p>
                    <p className="text-gray-400 mt-1">Ultimo paso registrado: {proyecto.paso}</p>
                  </div>
                  <div className="w-2/5">
                    <p className="font-bold text-gray-800">{proyecto.codigo}</p>
                    <p className="text-gray-700">{proyecto.lugar}</p>
                    <p className="text-gray-400 mt-1">{proyecto.fecha}</p>
                  </div>
                  <Link href="#" className="text-[#f7931e] font-semibold flex items-center hover:underline">Ver</Link>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-gray-400 italic">No hay proyectos en {tabProyectoActivo}.</p>
              </div>
            )}
          </div>
        </div>

        {/* --- PANEL DE CONTACTOS --- */}
        <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-semibold">Contactos <span className="text-gray-400 text-sm font-normal ml-1">(0)</span></h3>
            <button className="border border-[#8cc63f] text-[#8cc63f] px-4 py-1 rounded-full text-xs font-semibold hover:bg-green-50 transition-colors">
              Nuevo Contacto
            </button>
          </div>
          
          <div className="space-y-4 h-[260px] overflow-y-auto pr-2">
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-gray-400 italic">No hay contactos registrados.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
