'use client';

import { useState } from 'react';
import Link from 'next/link';
import Stepper from '../components/Stepper';
import Paso4OtrosCargos from '../components/Paso4OtrosCargos';

export default function PruebasPaso4Page() {
  const [pasoActivo, setPasoActivo] = useState(4);

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-6 md:p-10 relative h-max shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-[#00388d]">Nuevo Proyecto (Vista de Prueba Paso 4)</h2>
          <Link
            href="/proyectos/nuevo"
            className="text-xs font-semibold text-[#00388d] hover:underline"
          >
            Ir al Asistente Completo →
          </Link>
        </div>

        {/* --- STEPPER --- */}
        <Stepper pasoActivo={pasoActivo} onCambiarPaso={setPasoActivo} />

        {/* --- PASO 4: OTROS CARGOS --- */}
        <Paso4OtrosCargos
          onAnterior={() => alert('Navegar al paso anterior')}
          onSiguiente={() => alert('Paso 4 guardado exitosamente')}
        />
      </div>
    </div>
  );
}