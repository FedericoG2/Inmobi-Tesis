import { useMemo, useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminLayout } from '../../contexts/AdminLayoutContext'
import { supabase } from '../../supabaseClient'
import { brandAvatarClass } from '../../utils/brandUi'
import { buttonClass, surfacePopover } from '../../utils/ui'
import { IconLogout, IconSidebar } from '../../components/icons/Icons'
import NotificacionesBell from '../../components/ui/NotificacionesBell'
import { rutaAdminActividad } from '../../utils/actividadUi'

function nombreDesdeEmail(email) {
  if (!email) return 'Administrador'
  const local = email.split('@')[0]?.trim()
  if (!local) return 'Administrador'
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function inicialDesdeUsuario(email, nombre) {
  const fuente = nombre?.trim() || email?.trim() || 'A'
  return fuente.charAt(0).toUpperCase()
}

function UserAvatar({ inicial }) {
  return (
    <span className={`${brandAvatarClass} h-8 w-8 text-sm`} aria-hidden>
      {inicial}
    </span>
  )
}

export default function AdminTopbar() {
  const { user } = useAuth()
  const { sidebarCollapsed, toggleSidebar } = useAdminLayout()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const nombreVisible = useMemo(() => nombreDesdeEmail(user?.email), [user?.email])
  const inicial = useMemo(
    () => inicialDesdeUsuario(user?.email, nombreVisible),
    [user?.email, nombreVisible]
  )

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const handleSignOut = () => {
    setMenuOpen(false)
    supabase?.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-3 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={toggleSidebar}
        className={buttonClass({ variant: 'ghost', size: 'icon' })}
        aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        aria-expanded={!sidebarCollapsed}
      >
        <IconSidebar className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <NotificacionesBell rutaDe={rutaAdminActividad} subtitulo="Actividad del sistema en tiempo real" />
        <div className="h-6 w-px bg-slate-200" aria-hidden />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1 transition hover:bg-slate-100 sm:pr-2.5"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Cuenta y sesión"
          >
            <UserAvatar inicial={inicial} />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-sm font-medium leading-tight text-slate-900">{nombreVisible}</span>
              <span className="block truncate text-xs leading-tight text-slate-500">{user?.email ?? 'Sin sesión'}</span>
            </span>
          </button>

          {menuOpen && (
            <div role="menu" className={`${surfacePopover} absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden p-1`}>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium text-slate-900">{nombreVisible}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <IconLogout className="h-4 w-4 text-slate-400" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
