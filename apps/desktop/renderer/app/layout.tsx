import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotizador",
  description: "Cotizador de productos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* Agregamos las clases de Tailwind al body para el fondo y estructura general */}
      <body className="bg-[#8e94f2] m-0 p-0 min-h-screen">
        
        {/* --- BARRA DE NAVEGACIÓN GLOBAL (Pegada al techo) --- */}
        <nav className="bg-[#00388d] w-full px-8 py-4 rounded-b-2xl shadow-lg text-white flex flex-col md:flex-row items-center gap-8 relative z-50">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#00388d] font-bold text-xs shrink-0">
            Logo
          </div>
          
          <div className="hidden md:flex flex-1 justify-between items-center text-sm w-full pr-4 lg:pr-4">
            <Link href="/" className="font-semibold text-orange-200">Dashboard</Link>
            <Link href="/contactos" className="hover:text-orange-200 transition-colors">Contacto</Link>
            <Link href="/proyectos" className="hover:text-orange-200 transition-colors">Proyectos</Link>
            <Link href="/funnel" className="hover:text-orange-200 transition-colors">Funnel de ventas</Link>
            
            <div className="relative group">
              <button className="hover:text-orange-200 transition-colors py-2 cursor-pointer focus:outline-none">
                CRM ▾
              </button>
              <div className="absolute left-0 mt-0 w-40 bg-white text-gray-800 rounded-lg shadow-xl hidden group-hover:block border border-gray-100 overflow-hidden">
                <Link href="/crm/usuarios" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Usuarios</Link>
                <Link href="/crm/tareas" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Tareas</Link>
                <Link href="/crm/calendario" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Calendario</Link>
                <Link href="/crm/reportes" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors">Reportes</Link>
              </div>
            </div>

            <div className="relative group">
              <button className="hover:text-orange-200 transition-colors py-2 cursor-pointer focus:outline-none">
                Configuracion ▾
              </button>
              <div className="absolute left-0 mt-0 w-48 bg-white text-gray-800 rounded-lg shadow-xl hidden group-hover:block border border-gray-100 overflow-hidden">
                <Link href="/config/empresa" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Datos de la empresa</Link>
                <Link href="/config/catalogo" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Catálogo</Link>
                <Link href="/config/utilidad" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Utilidad</Link>
                <Link href="/config/pago" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Método de pago</Link>
                <Link href="/config/cotizacion" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors border-b border-gray-50">Formato de Cotización</Link>
                <Link href="/config/facturacion" className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 text-xs transition-colors">Facturación</Link>
              </div>
            </div>

            <div className="pl-6 border-l border-blue-400 flex items-center">
              <button className="flex items-center gap-2 hover:text-orange-200 transition-colors cursor-pointer">
                <div className="w-8 h-8 bg-orange-200 text-[#00388d] rounded-full flex items-center justify-center font-bold text-sm shadow-sm">U</div>
                <span className="font-medium">Usuario</span>
              </button>
            </div>
          </div>
        </nav>

        {/* --- AQUÍ SE INYECTAN LAS PÁGINAS (Dashboard, Formularios, etc.) --- */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>

      </body>
    </html>
  );
}
