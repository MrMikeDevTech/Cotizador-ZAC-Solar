'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Lock, User, Loader2, LogIn, UserPlus } from 'lucide-react';
import { Icono } from '../components/Icono';
import { api, ApiError } from '../../lib/api';
import { useSesion } from '../../lib/SesionContext';

/**
 * `null` mientras no se sabe si ya existe algún usuario registrado.
 * `true`/`false` refleja la respuesta de `GET /api/auth/estado`.
 */
type EstadoSistema = boolean | null;

const LONGITUD_MINIMA_PASSWORD = 8;

export default function LoginPage() {
  const router = useRouter();
  const { iniciarSesion } = useSesion();

  const [hayUsuarios, setHayUsuarios] = useState<EstadoSistema>(null);
  const [consultandoEstado, setConsultandoEstado] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  useEffect(() => {
    api
      .get<{ hayUsuarios: boolean }>('/api/auth/estado')
      .then((datos) => setHayUsuarios(datos.hayUsuarios))
      .catch(() => {
        // Sin backend disponible: se asume que sí hay usuarios para no
        // exponer el formulario de "primer admin" por error de red.
        setHayUsuarios(true);
        toast.error('No se pudo conectar con el servidor local.');
      })
      .finally(() => setConsultandoEstado(false));
  }, []);

  const esPrimerRegistro = hayUsuarios === false;

  const manejarEnvio = async (evento: FormEvent) => {
    evento.preventDefault();
    if (enviando) return;

    if (esPrimerRegistro) {
      if (password.length < LONGITUD_MINIMA_PASSWORD) {
        toast.error(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
        return;
      }
      if (password !== confirmacion) {
        toast.error('Las contraseñas no coinciden.');
        return;
      }
    }

    setEnviando(true);
    try {
      if (esPrimerRegistro) {
        await api.post('/api/auth/primer-admin', { email, nombre, password });
      }
      await iniciarSesion(email, password);
      router.push('/');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#8e94f2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-10 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.jpeg" alt="Zac-Solar" className="h-14 w-auto object-contain rounded-lg" />
          <h1 className="text-xl font-bold text-[#00388d]">
            {esPrimerRegistro ? 'Crear cuenta de administrador' : 'Iniciar sesión'}
          </h1>
          {esPrimerRegistro && (
            <p className="text-xs text-gray-500 leading-relaxed">
              Aún no hay usuarios registrados. Esta primera cuenta se creará con permisos de
              administrador. Las demás cuentas se crean después desde el CRM.
            </p>
          )}
        </div>

        {consultandoEstado ? (
          <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>
        ) : (
          <form onSubmit={manejarEnvio} className="space-y-4">
            {esPrimerRegistro && (
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
                    placeholder="Nombre completo"
                  />
                </div>
              </div>
            )}

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
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Contraseña</label>
              <div className="flex items-center gap-2 border-b border-gray-300 focus-within:border-[#00388d] py-1.5">
                <Icono icon={Lock} size={16} className="text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={esPrimerRegistro ? LONGITUD_MINIMA_PASSWORD : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm text-gray-800 focus:outline-none"
                  placeholder="••••••••"
                  autoComplete={esPrimerRegistro ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {esPrimerRegistro && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Confirmar contraseña</label>
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
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-[#f7931e] hover:bg-orange-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {enviando ? (
                <>
                  <Icono icon={Loader2} size={16} className="animate-spin" />
                  {esPrimerRegistro ? 'Creando cuenta…' : 'Entrando…'}
                </>
              ) : (
                <>
                  <Icono icon={esPrimerRegistro ? UserPlus : LogIn} size={16} />
                  {esPrimerRegistro ? 'Crear cuenta de administrador' : 'Entrar'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
