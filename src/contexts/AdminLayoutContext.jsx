import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'inmobi-admin-sidebar-collapsed'

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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      persistCollapsedPreference(next)
      return next
    })
  }, [])

  return (
    <AdminLayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
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
