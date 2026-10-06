'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Shield, Trash2, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { useSesion } from '../../../lib/SesionContext';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTable, type ColumnaTabla } from '../../components/DataTable';
import { Icono } from '../../components/Icono';

type RolUsuario = 'admin' | 'usuario';

/**
 * Forma completa que devuelve `GET /api/usuarios` (vía `aUsuarioSesion` en el
 * backend). Es más amplia que `UsuarioSesion` de `SesionContext` —esa solo
 * describe al usuario con sesión activa— así que se tipa aparte aquí.
 */
interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLES: { valor: RolUsuario; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Administrador' },
  { valor: 'usuario', etiqueta: 'Usuario' },
];

function formatearFecha(fecha: string | Date | null): string {
  if (!fecha) return 'Nunca';
  const d = new Date(fecha);
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Administración de usuarios del CRM contra `/api/usuarios`. Las acciones de
 * administrador (crear, cambiar rol, activar/desactivar, borrar) se ocultan
 * para quien no tenga `rol === 'admin'`: el backend las rechaza igual, pero
 * no tiene sentido mostrar controles que van a fallar.
 */
export default function UsuariosCRMPage() {
  const { usuario: usuarioActual } = useSesion();
  const esAdmin = usuarioActual?.rol === 'admin';

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('usuario');

  const [usuarioABorrar, setUsuarioABorrar] = useState<UsuarioAdmin | null>(null);
  const [idEnProceso, setIdEnProceso] = useState<string | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api.get<UsuarioAdmin[]>('/api/usuarios');
      setUsuarios(datos);
      setMensajeError(null);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo cargar la lista de usuarios.';
      setMensajeError(mensaje);
      setUsuarios([]);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleCrearUsuario = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) {
      toast.error('Nombre y correo son obligatorios.');
      return;
    }
    if (nuevoPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/api/usuarios', {
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim(),
        password: nuevoPassword,
        rol: nuevoRol,
      });
      toast.success('Usuario creado.');
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoPassword('');
      setNuevoRol('usuario');
      setModalAbierto(false);
      await cargarUsuarios();
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo crear el usuario.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarRol = async (u: UsuarioAdmin, rol: RolUsuario) => {
    if (rol === u.rol || idEnProceso) return;
    setIdEnProceso(u.id);
    try {
      const actualizado = await api.patch<UsuarioAdmin>(`/api/usuarios/${u.id}`, { rol });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)));
      toast.success('Rol actualizado.');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo cambiar el rol.';
      toast.error(mensaje);
    } finally {
      setIdEnProceso(null);
    }
  };

  const handleToggleActivo = async (u: UsuarioAdmin) => {
    if (idEnProceso) return;
    setIdEnProceso(u.id);
    try {
      const actualizado = await api.patch<UsuarioAdmin>(`/api/usuarios/${u.id}`, { activo: !u.activo });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)));
      toast.success(actualizado.activo ? 'Usuario activado.' : 'Usuario desactivado.');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo actualizar el estado.';
      toast.error(mensaje);
    } finally {
      setIdEnProceso(null);
    }
  };

  const handleBorrar = async () => {
    if (!usuarioABorrar) return;
    try {
      await api.del(`/api/usuarios/${usuarioABorrar.id}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== usuarioABorrar.id));
      toast.success('Usuario eliminado.');
      setUsuarioABorrar(null);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo eliminar el usuario.';
      toast.error(mensaje);
    }
  };

  const columnas: ColumnaTabla<UsuarioAdmin>[] = [
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      render: (u) => <span className="font-semibold text-gray-800">{u.nombre}</span>,
    },
    {
      clave: 'email',
      encabezado: 'Email',
      render: (u) => <span className="text-gray-500 font-mono">{u.email}</span>,
    },
    {
      clave: 'rol',
      encabezado: 'Rol',
      render: (u) =>
        esAdmin ? (
          <select
            value={u.rol}
            disabled={idEnProceso === u.id}
            onChange={(e) => handleCambiarRol(u, e.target.value as RolUsuario)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#00388d] bg-white focus:outline-none focus:ring-2 focus:ring-[#00388d]/30 disabled:opacity-50 cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-xs text-[#00388d]">
            <Icono icon={u.rol === 'admin' ? ShieldCheck : Shield} size={14} />
            {u.rol === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
        ),
    },
    {
      clave: 'activo',
      encabezado: 'Activo',
      render: (u) => (
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            u.activo
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {u.activo ? 'Sí' : 'No'}
        </span>
      ),
    },
    {
      clave: 'ultimoAcceso',
      encabezado: 'Último acceso',
      render: (u) => <span className="text-gray-400">{formatearFecha(u.ultimoAcceso)}</span>,
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (u) => {
        if (!esAdmin) return <span className="text-gray-300">—</span>;
        const esUnoMismo = u.id === usuarioActual?.id;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggleActivo(u)}
              disabled={esUnoMismo || idEnProceso === u.id}
              title={esUnoMismo ? 'No puedes desactivar tu propia cuenta' : undefined}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
            >
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={() => setUsuarioABorrar(u)}
              disabled={esUnoMismo || idEnProceso === u.id}
              title={esUnoMismo ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
              className="text-[#ef4444] hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono icon={Trash2} size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">Administración CRM</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-700">Listado de usuarios CRM</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Usuarios activos <span className="font-semibold text-gray-600">{usuarios.filter((u) => u.activo).length}</span> de{' '}
                {usuarios.length}
              </p>
            </div>

            {esAdmin && (
              <button
                onClick={() => setModalAbierto(true)}
                className="bg-[#00388d] hover:bg-blue-900 text-white px-6 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Icono icon={UserPlus} size={14} />
                Crear usuario CRM
              </button>
            )}
          </div>

          {cargando ? (
            <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Icono icon={Loader2} size={16} className="animate-spin" />
              Cargando usuarios…
            </div>
          ) : (
            <DataTable
              columnas={columnas}
              filas={usuarios}
              claveFila={(u) => u.id}
              vacio={mensajeError ?? 'No hay usuarios registrados.'}
            />
          )}
        </div>
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Nuevo usuario CRM"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-nuevo-usuario"
              disabled={guardando}
              className="px-5 py-2 bg-[#00388d] hover:bg-blue-900 text-white rounded-full font-semibold shadow-md text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando…' : 'Guardar usuario'}
            </button>
          </>
        }
      >
        <form id="form-nuevo-usuario" onSubmit={handleCrearUsuario} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Nombre completo</label>
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
            <label className="block text-gray-600 font-semibold mb-1">Correo electrónico</label>
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
            <label className="block text-gray-600 font-semibold mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={nuevoPassword}
              onChange={(e) => setNuevoPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Rol</label>
            <select
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00388d]/30 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        abierto={usuarioABorrar !== null}
        onCerrar={() => setUsuarioABorrar(null)}
        onConfirmar={handleBorrar}
        titulo="Eliminar usuario"
        mensaje={`¿Estás seguro de eliminar a "${usuarioABorrar?.nombre ?? ''}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  );
}
