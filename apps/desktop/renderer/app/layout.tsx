import type { Metadata } from "next";
import { Toaster } from 'sonner';
import { ConfiguracionProvider } from '../lib/ConfiguracionContext';
import { SesionProvider } from '../lib/SesionContext';
import "./globals.css";
import { GuardSesion } from './components/GuardSesion';

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

        <SesionProvider>
          <ConfiguracionProvider>

            <GuardSesion>
              {children}
            </GuardSesion>

            <Toaster position="top-right" richColors />

          </ConfiguracionProvider>
        </SesionProvider>

      </body>
    </html>
  );
}