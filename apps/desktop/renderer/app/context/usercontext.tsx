'use client';

import React, { createContext, useContext, useState } from 'react';

export const USUARIOS_SISTEMA = [
  'Octavio Angel Aguirre',
  'Miguel Angel Martinez',
  'Invitado'
];

interface UserContextType {
  usuarioActivo: string;
  setUsuarioActivo: (usuario: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [usuarioActivo, setUsuarioActivo] = useState(USUARIOS_SISTEMA[0]);

  return (
    <UserContext.Provider value={{ usuarioActivo, setUsuarioActivo }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe usarse dentro de un UserProvider');
  }
  return context;
}