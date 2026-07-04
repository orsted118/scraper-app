import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'dvpotro-sidebar-compact';

function loadSidebarCompact() {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(STORAGE_KEY) === 'true';
}

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [sidebarCompact, setSidebarCompactState] = useState(loadSidebarCompact);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(sidebarCompact));
    } catch (error) {
      console.warn('No se pudo guardar la preferencia de sidebar compacto', error);
    }
  }, [sidebarCompact]);

  const setSidebarCompact = useCallback((value) => {
    setSidebarCompactState(Boolean(value));
  }, []);

  const value = useMemo(
    () => ({ sidebarCompact, setSidebarCompact }),
    [sidebarCompact, setSidebarCompact],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useContext(SidebarContext);
}
