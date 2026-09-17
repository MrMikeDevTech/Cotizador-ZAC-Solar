'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface UsuarioCRM {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'VENDEDOR' | 'GERENTE' | 'SOPORTE';
  sucursal: string;
  activo: boolean;
}

const usuariosIniciales: UsuarioCRM[] = [
  {
    id: 1,
    nombre: 'Miguel Angel Martinez',
    email: 'mae2492.martinez@gmail.com',
    rol: 'ADMINISTRADOR',
    sucursal: 'Matriz - Tepic',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Jessica Robles',
    email: 'jessica.robles@zacsolar.com',
    rol: 'GERENTE',
    sucursal: 'Guadalajara',
    activo: true,
  },
  {
    id: 3,
    nombre: 'Carlos Eduardo Peña',
    email: 'carlos.pena@zacsolar.com',
    rol: 'VENDEDOR',
    sucursal: 'Puerto Vallarta',
    activo: true,
  },
];

export default function UsuariosCRMPage() {
  const [usuarios, setUsuarios] = useState<UsuarioCRM[]>(usuariosIniciales);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [limiteUsuarios] = useState(5); // Límite de licencias de usuarios

  // Estado del formulario para nuevo usuario
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState<UsuarioCRM['rol']>('VENDEDOR');
  const [nuevaSucursal, setNuevaSucursal] = useState('');

  useEffect(() => {
    api
      .get<UsuarioCRM[]>('/api/crm/usuarios')
      .then((data) => {
        if (data && data.length > 0) setUsuarios(data);
      })
      .catch(() => {
        // Se mantienen los usuarios iniciales si la API backend no está disponible
      });
  }, []);

  const activosCount = usuarios.filter((u) => u.activo).length;

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail) return;

    const nuevoUsuario: UsuarioCRM = {
      id: usuarios.length + 1,
      nombre: nuevoNombre,
      email: nuevoEmail,
      rol: nuevoRol,
      sucursal: nuevaSucursal || '--',
      activo: true,
    };

    setUsuarios((prev) => [...prev, nuevoUsuario]);

    // Opcional: enviar al backend
    api.post('/api/crm/usuarios', nuevoUsuario).catch(() => {});

    // Limpieza de campos
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoRol('VENDEDOR');
    setNuevaSucursal('');
    setModalAbierto(false);
  };

  const toggleEstado = (id: number) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u))
    );
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
            Administración CRM
          </h1>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          
          {/* ENCABEZADO DE LA TABLA Y BOTÓN */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-700">
                Listado de usuarios CRM
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Usuarios CRM activos <span className="font-semibold text-gray-600">{activosCount}</span> de {limiteUsuarios}
              </p>
            </div>

            <button
              onClick={() => setModalAbierto(true)}
              className="bg-[#00388d] hover:bg-blue-900 text-white px-6 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>+ Crear usuario CRM</span>
            </button>
          </div>

          {/* TABLA DE USUARIOS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Nombre</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Rol</th>
                  <th className="py-3 px-3">Sucursal</th>
                  <th className="py-3 px-3 text-center">Activo</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {usuarios.length > 0 ? (
                  usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-3 text-center text-gray-400 font-medium">{u.id}</td>
                      <td className="py-4 px-3 font-semibold text-gray-800">{u.nombre}</td>
                      <td className="py-4 px-3 text-gray-500 font-mono">{u.email}</td>
                      <td className="py-4 px-3 font-bold text-xs text-[#00388d]">{u.rol}</td>
                      <td className="py-4 px-3 text-gray-500">{u.sucursal}</td>
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {u.activo ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => toggleEstado(u.id)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* MODAL PARA CREAR USUARIO CRM */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Nuevo Usuario CRM</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@zacsolar.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Rol</label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as UsuarioCRM['rol'])}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30 bg-white"
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  <option value="GERENTE">GERENTE</option>
                  <option value="VENDEDOR">VENDEDOR</option>
                  <option value="SOPORTE">SOPORTE</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Sucursal</label>
                <input
                  type="text"
                  placeholder="Ej. Tepic / Guadalajara"
                  value={nuevaSucursal}
                  onChange={(e) => setNuevaSucursal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00388d] hover:bg-blue-900 text-white rounded-full font-semibold shadow-md"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}