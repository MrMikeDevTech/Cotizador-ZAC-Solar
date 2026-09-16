'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contacto {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string; // Localidad, Estado
  estatus: string;
  telefono?: string;
  celular?: string;
  email?: string;
  notas?: string;
}

// Datos de prueba (puedes reemplazarlos por tu estado global o llamadas a datos)
const contactosDashboardIniciales: Contacto[] = [
  {
    id: '1',
    codigo: 'ZAC-001',
    nombre: 'Cliente de Prueba 1',
    ubicacion: 'Zacatecas, Zacatecas',
    estatus: 'Solicitud de recibo',
    telefono: '4921234567',
    email: 'cliente1@correo.com',
    notas: 'Requiere tarifa PDBT',
  },
  {
    id: '2',
    codigo: 'ZAC-002',
    nombre: 'Cliente de Prueba 2',
    ubicacion: 'Guadalupe, Zacatecas',
    estatus: 'Primer contacto',
    telefono: '4929876543',
    email: 'cliente2@correo.com',
    notas: 'Interesado en sistema de 10kW',
  },
];

export default function ContactosWidget() {
  const router = useRouter();
  const [contactos] = useState<Contacto[]>(contactosDashboardIniciales);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);

  // Redirección al módulo completo de contactos
  const handleIrANuevoContacto = () => {
    router.push('/contactos');
  };

  // Redirección a Nuevo Proyecto pasando los datos del contacto por URL
  const handleCrearProyecto = (contacto: Contacto) => {
    const params = new URLSearchParams({
      contactoId: contacto.id,
      nombre: contacto.nombre,
      ubicacion: contacto.ubicacion,
      telefono: contacto.telefono || '',
      email: contacto.email || '',
    });
    
    router.push(`/proyectos/nuevo?${params.toString()}`);
  };

  // Handler para botón Crear Tarea
  const handleCrearTarea = (contacto: Contacto) => {
    alert(`Crear tarea para: ${contacto.nombre}`);
    // Aquí puedes abrir tu modal de tareas o redirigir a /tareas
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
      {/* CABECERA CON CONTADOR Y BOTÓN */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">
          Contactos <span className="text-gray-400 font-normal">({contactos.length})</span>
        </h2>
        
        <button
          onClick={handleIrANuevoContacto}
          className="border border-[#8cc63f] text-[#8cc63f] hover:bg-[#8cc63f] hover:text-white px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer"
        >
          Nuevo Contacto
        </button>
      </div>

      {/* TABLA SIMPLIFICADA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 font-semibold">
              <th className="py-2 px-2">Nombre</th>
              <th className="py-2 px-2">Localidad/Estado</th>
              <th className="py-2 px-2">Estatus</th>
              <th className="py-2 px-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {contactos.length > 0 ? (
              contactos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2 font-medium text-gray-800">{c.nombre}</td>
                  <td className="py-3 px-2 text-gray-500">{c.ubicacion}</td>
                  <td className="py-3 px-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-[#00388d]">
                      {c.estatus}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => setContactoSeleccionado(c)}
                      className="text-[#00388d] hover:underline font-semibold text-xs cursor-pointer"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                  No hay contactos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALLES DEL CONTACTO */}
      {contactoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-6">
            
            {/* Cabecera del modal */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-[#00388d]">{contactoSeleccionado.codigo}</span>
                <h3 className="text-xl font-bold text-gray-800">{contactoSeleccionado.nombre}</h3>
              </div>
              <button
                onClick={() => setContactoSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Datos detallados */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Ubicación</p>
                <p className="text-gray-700 font-semibold">{contactoSeleccionado.ubicacion}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Estatus</p>
                <p className="text-gray-700 font-semibold">{contactoSeleccionado.estatus}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Teléfono / Celular</p>
                <p className="text-gray-700 font-semibold">{contactoSeleccionado.telefono || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Correo Electrónico</p>
                <p className="text-gray-700 font-semibold">{contactoSeleccionado.email || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 font-medium">Notas</p>
                <p className="text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1">
                  {contactoSeleccionado.notas || 'Sin notas adicionales.'}
                </p>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleCrearTarea(contactoSeleccionado)}
                className="w-full sm:w-auto border border-[#00388d] text-[#00388d] hover:bg-blue-50 px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Crear Tarea
              </button>
              
              <button
                onClick={() => handleCrearProyecto(contactoSeleccionado)}
                className="w-full sm:w-auto bg-[#00388d] hover:bg-blue-900 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                + Nuevo Proyecto
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}