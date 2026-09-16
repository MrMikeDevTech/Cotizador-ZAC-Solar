'use client';

import { useUser, USUARIOS_SISTEMA } from '../context/usercontext';

export function UserSelector() {
  const { usuarioActivo, setUsuarioActivo } = useUser();

  return (
    <div className="pl-6 border-l border-blue-400/50 flex items-center gap-2">
      <div className="w-8 h-8 bg-orange-200 text-[#00388d] rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
        {usuarioActivo.charAt(0)}
      </div>
      <select
        value={usuarioActivo}
        onChange={(e) => setUsuarioActivo(e.target.value)}
        className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer border-none py-1 pr-1"
      >
        {USUARIOS_SISTEMA.map((usuario) => (
          <option key={usuario} value={usuario} className="text-gray-800 font-normal">
            {usuario}
          </option>
        ))}
      </select>
    </div>
  );
}