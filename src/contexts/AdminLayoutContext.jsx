import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'inmobi-admin-sidebar-collapsed'
// Mismo corte que `lg:` de Tailwind: debajo, el menú lateral es un cajón que se abre encima.
const MEDIA_ESCRITORIO = '(min-width: 1024px)'

const AdminLayoutContext = createContext(null)

function readCollapsedPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  } catch {
    /* ignore */
  }
}

export function AdminLayoutProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedPreference)
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      persistCollapsedPreference(next)
      return next
    })
  }, [])

  const abrirMenuMovil = useCallback(() => setMenuMovilAbierto(true), [])
  const cerrarMenuMovil = useCallback(() => setMenuMovilAbierto(false), [])

  // Con el cajón abierto: Escape lo cierra, la página de fondo no scrollea
  // y si la ventana pasa a tamaño escritorio se cierra solo.
  useEffect(() => {
    if (!menuMovilAbierto) return

    const media = window.matchMedia(MEDIA_ESCRITORIO)
    const onMedia = (event) => {
      if (event.matches) setMenuMovilAbierto(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuMovilAbierto(false)
    }

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    media.addEventListener('change', onMedia)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = overflowPrevio
      media.removeEventListener('change', onMedia)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuMovilAbierto])

  return (
    <AdminLayoutContext.Provider
      value={{ sidebarCollapsed, toggleSidebar, menuMovilAbierto, abrirMenuMovil, cerrarMenuMovil }}
    >
      {children}
    </AdminLayoutContext.Provider>
  )
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext)
  if (!ctx) {
    throw new Error('useAdminLayout debe usarse dentro de AdminLayoutProvider')
  }
  return ctx
}
