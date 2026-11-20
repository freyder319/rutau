import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, evento } from './api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/yo')
      .then((r) => { setUsuario(r.usuario); evento('visita'); })
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  const entrar = useCallback((token, u) => {
    setToken(token);
    setUsuario(u);
    evento('visita');
  }, []);

  const salir = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  return <Ctx.Provider value={{ usuario, setUsuario, entrar, salir, cargando }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
