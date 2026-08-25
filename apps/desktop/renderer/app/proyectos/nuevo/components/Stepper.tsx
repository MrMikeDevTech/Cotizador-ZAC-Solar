'use client';

import { PasoWizard } from '../types';
import { PASOS_PROYECTO } from '../constants';

interface StepperProps {
  pasoActivo: number;
  pasos?: PasoWizard[];
  onCambiarPaso?: (paso: number) => void;
}

export default function Stepper({
  pasoActivo,
  pasos = PASOS_PROYECTO,
  onCambiarPaso,
}: StepperProps) {
  return (
    <div className="flex flex-wrap justify-between items-center border-b border-gray-100 pb-4 mb-8 text-sm gap-4">
      {pasos.map((paso) => {
        const esActivo = pasoActivo === paso.num;
        const esCompletado = pasoActivo > paso.num;

        return (
          <div
            key={paso.num}
            onClick={() => onCambiarPaso && onCambiarPaso(paso.num)}
            className={`flex items-center gap-2 ${esActivo ? 'border-b-2 border-[#00388d] pb-2' : ''} ${onCambiarPaso ? 'cursor-pointer' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                esActivo
                  ? 'bg-[#00388d] text-white shadow-md'
                  : esCompletado
                  ? 'bg-[#8cc63f] text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {paso.num}
            </div>
            <span
              className={`font-medium leading-tight ${
                esActivo ? 'text-[#00388d] font-bold' : 'text-gray-400'
              }`}
            >
              Paso<br />
              {paso.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
