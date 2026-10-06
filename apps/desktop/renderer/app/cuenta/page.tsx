'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Mail, User, Lock, Loader2, Save, TriangleAlert } from 'lucide-react';
import { Icono } from '../components/Icono';
import { api, ApiError } from '../../lib/api';
import { useSesion, type UsuarioSesion } from '../../lib/SesionContext';

const LONGITUD_MINIMA_PASSWORD = 8;

/**
 * Formulario de datos de cuenta (nombre, email) contra `PATCH /api/auth/yo`.
 * Vive aparte del de contraseña porque tienen ciclos de guardado y mensajes
 * de error independientes.
 */
function FormularioDatos({ usuario }: { usuario: UsuarioSesion }) {
  const { actualizarUsuario } = useSesion();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [email, setEmail] = useState(usuario.email);
  const [guardando, setGuardando] = useState(false);

  const manejarEnvio = async (evento: FormEvent) => {
    evento.preventDefault();
    if (guardando) return;

    if (!nombre.trim()) {
      toast.error('El nombre no puede quedar vacío.');
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await api.patch<UsuarioSesion>('/api/auth/yo', { nombre, email });
      actualizarUsuario(actualizado);
      setNombre(actualizado.nombre);
      setEmail(actualizado.email);
      toast.success('Datos actualizados.');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudieron guardar los datos.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
      <h2 className="text-lg font-bold text-[#00388d] mb-6">Datos de la cuenta</h2>
      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nombre</label>
          <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
            <Icono icon={User} size={16} className="text-gray-400" />
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full text-sm text-gray-800 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
          <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
            <Icono icon={Mail} size={16} className="text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm text-gray-800 focus:outline-none"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icono icon={guardando ? Loader2 : Save} size={14} className={guardando ? 'animate-spin' : ''} />
            {guardando ? 'Guardando…' : 'Guardar datos'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Formulario de cambio de contraseña contra `POST /api/auth/yo/password`.
 * El backend invalida las demás sesiones del usuario al cambiarla (conserva
 * solo la que hizo el cambio), así que se avisa en la propia UI.
 */
function FormularioPassword() {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const limpiarCampos = () => {
    setPasswordActual('');
    setPasswordNueva('');
    setConfirmacion('');
  };

  const manejarEnvio = async (evento: FormEvent) => {
    evento.preventDefault();
    if (guardando) return;

    if (passwordNueva.length < LONGITUD_MINIMA_PASSWORD) {
      toast.error(`La contraseña nueva debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
      return;
    }
    if (passwordNueva !== confirmacion) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/api/auth/yo/password', { passwordActual, passwordNueva });
      limpiarCampos();
      toast.success('Contraseña actualizada. Tus demás sesiones se cerraron.');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo cambiar la contraseña.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
      <h2 className="text-lg font-bold text-[#00388d] mb-2">Cambiar contraseña</h2>

      <div className="flex items-start gap-2 bg-orange-50 text-orange-700 rounded-xl px-3 py-2.5 mb-6">
        <Icono icon={TriangleAlert} size={16} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Al cambiar tu contraseña se cerrarán todas tus demás sesiones iniciadas; esta sesión
          seguirá activa.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Contraseña actual</label>
          <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
            <Icono icon={Lock} size={16} className="text-gray-400" />
            <input
              type="password"
              required
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full text-sm text-gray-800 focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Contraseña nueva</label>
          <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
            <Icono icon={Lock} size={16} className="text-gray-400" />
            <input
              type="password"
              required
              minLength={LONGITUD_MINIMA_PASSWORD}
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full text-sm text-gray-800 focus:outline-none"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Confirmar contraseña nueva</label>
          <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
            <Icono icon={Lock} size={16} className="text-gray-400" />
            <input
              type="password"
              required
              minLength={LONGITUD_MINIMA_PASSWORD}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className="w-full text-sm text-gray-800 focus:outline-none"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icono icon={guardando ? Loader2 : Save} size={14} className={guardando ? 'animate-spin' : ''} />
            {guardando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CuentaPage() {
  const { usuario, cargando } = useSesion();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white px-2">Mi cuenta</h1>

      {cargando || !usuario ? (
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <p className="text-sm text-gray-400">Cargando…</p>
        </div>
      ) : (
        <>
          <FormularioDatos usuario={usuario} />
          <FormularioPassword />
        </>
      )}
    </div>
  );
}
