'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSesion } from '../../lib/SesionContext';
import { NavPrincipal } from './NavPrincipal';

const RUTA_LOGIN = '/login';
const PREFIJO_DOCUMENTOS = '/documentos';

/**
 * Quita la barra final de una ruta, dejando `/` intacta.
 *
 * `next.config.ts` usa `trailingSlash: true` (lo necesita el export estático),
 * así que la URL canónica del login es `/login/` y `usePathname()` devuelve la
 * barra. Comparar en crudo contra `'/login'` daba `false` **estando** en el
 * login: el guard se creía fuera, se quedaba en la pantalla "Cargando…" y
 * redirigía a `/login` en bucle.
 */
function normalizarRuta(ruta: string): string {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
}

/**
 * Controla el acceso a toda la aplicación según el estado de sesión:
 * - Sin sesión y fuera de `/login` → redirige a `/login`.
 * - Con sesión y dentro de `/login` → redirige a `/`.
 * - Mientras se valida la sesión (al recargar la app) no decide nada, para
 *   no mostrar un parpadeo del login antes de confirmar que sí hay sesión.
 *
 * También es responsable de que el nav principal no aparezca en `/login` ni
 * en `/documentos/*`: esas rutas son las vistas de impresión que Electron
 * fotografía con `printToPDF` (y que también se abren directo en el
 * navegador para "Guardar como PDF" desde ahí) — el menú de la app no debe
 * terminar impreso dentro del documento. La sesión sigue exigida (la vista
 * llama a `/api/proyectos/:id`, que va autenticado); solo se quita el
 * cromo visual (nav + padding del `<main>`).
 */
export function GuardSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const pathname = usePathname();
  const router = useRouter();
  const rutaActual = normalizarRuta(pathname);
  const enLogin = rutaActual === RUTA_LOGIN;
  const enDocumentos = rutaActual === PREFIJO_DOCUMENTOS || rutaActual.startsWith(`${PREFIJO_DOCUMENTOS}/`);

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

  if (enLogin || enDocumentos) {
    return <>{children}</>;
  }

  return (
    <>
      <NavPrincipal />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </>
  );
}
