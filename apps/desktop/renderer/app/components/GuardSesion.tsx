'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSesion } from '../../lib/SesionContext';
import { NavPrincipal } from './NavPrincipal';

const RUTA_LOGIN = '/login';

/**
 * Controla el acceso a toda la aplicación según el estado de sesión:
 * - Sin sesión y fuera de `/login` → redirige a `/login`.
 * - Con sesión y dentro de `/login` → redirige a `/`.
 * - Mientras se valida la sesión (al recargar la app) no decide nada, para
 *   no mostrar un parpadeo del login antes de confirmar que sí hay sesión.
 *
 * También es responsable de que el nav principal no aparezca en `/login`.
 */
export function GuardSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const pathname = usePathname();
  const router = useRouter();
  const enLogin = pathname === RUTA_LOGIN;

  useEffect(() => {
    if (cargando) return;
    if (!usuario && !enLogin) {
      router.replace(RUTA_LOGIN);
      return;
    }
    if (usuario && enLogin) {
      router.replace('/');
    }
  }, [usuario, cargando, enLogin, router]);

  // Mientras se valida el token guardado, estado neutro sin parpadeos.
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#8e94f2] flex items-center justify-center">
        <p className="text-sm text-white/80">Cargando…</p>
      </div>
    );
  }

  // A punto de redirigir (sesión inválida fuera de /login, o sesión válida
  // dentro de /login): no se renderiza contenido mientras el router navega.
  if ((!usuario && !enLogin) || (usuario && enLogin)) {
    return (
      <div className="min-h-screen bg-[#8e94f2] flex items-center justify-center">
        <p className="text-sm text-white/80">Cargando…</p>
      </div>
    );
  }

  if (enLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <NavPrincipal />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </>
  );
}
