import { useMemo, useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../supabaseClient'

function IconLogout({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  )
}

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
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm"
      aria-hidden
    >
      {inicial}
    </span>
  )
}

export default function AdminTopbar() {
  const { user } = useAuth()
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
    <header
      className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 shadow-sm shadow-slate-200/60 sm:px-6 lg:px-8"
    >
      {/* Móvil: menú compacto */}
      <div className="relative sm:hidden" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-1.5 transition hover:border-slate-300"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Cuenta y sesión"
        >
          <UserAvatar inicial={inicial} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-100"
          >
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900">{nombreVisible}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <IconLogout className="text-slate-400" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Desktop: chip + cerrar sesión */}
      <div className="hidden items-center gap-3 sm:flex">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 py-1.5 pl-1.5 pr-3">
          <UserAvatar inicial={inicial} />
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900">
              {nombreVisible}
            </p>
            <p className="truncate text-xs leading-tight text-slate-500">
              {user?.email ?? 'Sin sesión'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <IconLogout />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  )
}
