import type { Metadata } from "next";
import Link from 'next/link';
import { ConfiguracionProvider } from '../lib/ConfiguracionContext';
import "./globals.css";
import { UserProvider } from './context/usercontext';
import { UserSelector } from './components/UserSelector';

export const metadata: Metadata = {
  title: "Cotizador Zac-Solar",
  description: "Cotizador de productos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-[#8e94f2] m-0 p-0 min-h-screen">
        
        <UserProvider>
          <ConfiguracionProvider>
            
            {/* BARRA DE NAVEGACIÓN GLOBAL */}
            <nav className="bg-[#00388d] w-full px-8 py-3 rounded-b-2xl shadow-lg text-white flex flex-col md:flex-row items-center gap-8 relative z-50">
              
              {/* Logo clickeable que te regresa al Dashboard */}
              <Link href="/" className="flex items-center shrink-0 hover:opacity-90 transition-opacity">
                <img 
                  src="/logo.jpeg" 
                  alt="Zac-Solar" 
                  className="h-10 w-auto object-contain rounded-lg"
                />
              </Link>
              
              <div className="hidden md:flex flex-1 justify-between items-center text-sm w-full pr-4">
                <Link href="/" className="hover:text-orange-200 transition-colors font-medium">
                  Dashboard
                </Link>
                <Link href="/contactos" className="hover:text-orange-200 transition-colors font-medium">
                  Contacto
                </Link>
                <Link href="/proyectos" className="hover:text-orange-200 transition-colors font-medium">
                  Proyectos
                </Link>
                <Link href="/funnel" className="hover:text-orange-200 transition-colors font-medium">
                  Funnel de ventas
                </Link>
                
                {/* Menú CRM */}
                <div className="relative group py-2">
                  <button className="hover:text-orange-200 transition-colors cursor-pointer focus:outline-none flex items-center gap-1 font-medium">
                    CRM ▾
                  </button>
                  <div className="absolute left-0 top-full pt-1 w-40 hidden group-hover:block">
                    <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                      <Link href="/crm/usuarios" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Usuarios</Link>
                      <Link href="/crm/tareas" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Tareas</Link>
                      <Link href="/crm/calendario" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Calendario</Link>
                      <Link href="/crm/reportes" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors">Reportes</Link>
                    </div>
                  </div>
                </div>

                {/* Menú Configuración */}
                <div className="relative group py-2">
                  <button className="hover:text-orange-200 transition-colors cursor-pointer focus:outline-none flex items-center gap-1 font-medium">
                    Configuración ▾
                  </button>
                  <div className="absolute left-0 top-full pt-1 w-48 hidden group-hover:block">
                    <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                      <Link href="/config/empresa" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Datos de la empresa</Link>
                      <Link href="/config/catalogo" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Catálogo</Link>
                      <Link href="/config/utilidad" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Utilidad</Link>
                      <Link href="/config/pago" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Método de pago</Link>
                      <Link href="/config/cotizacion" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-100">Formato de Cotización</Link>
                      <Link href="/config/facturacion" className="block px-4 py-2.5 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors">Facturación</Link>
                    </div>
                  </div>
                </div>

                {/* Perfil / Selector de Usuario */}
                <UserSelector />

              </div>
            </nav>

            <main className="flex-1 p-4 md:p-8">
              {children}
            </main>

          </ConfiguracionProvider>
        </UserProvider>

      </body>
    </html>
  );
}