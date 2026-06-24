import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { supabase } from '../../supabaseClient'

function inicialesDesdeNombre(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  }
  return (nombre ?? 'IN').slice(0, 2).toUpperCase()
}

function IconBell({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  )
}

function IconLogout({ className = 'h-5 w-5' }) {
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

function UserAvatar({ iniciales }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-sm"
      aria-hidden
    >
      {iniciales}
    </span>
  )
}

const actionClassName =
  'relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:text-slate-800'

export default function InquilinoHeader() {
  const { inquilino, reclamos } = usePortalInquilino()

  const primerNombre = inquilino?.nombre_completo?.split(' ')[0] ?? 'Inquilino'
  const iniciales = useMemo(
    () => inicialesDesdeNombre(inquilino?.nombre_completo),
    [inquilino?.nombre_completo]
  )

  const reclamosPendientes = reclamos.filter((r) => r.estado === 'Pendiente').length

  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-40 bg-indigo-50/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar iniciales={iniciales} />
          <p className="truncate text-base font-bold text-slate-900">Hola, {primerNombre}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/inquilino/reclamos"
            className={actionClassName}
            aria-label={
              reclamosPendientes > 0
                ? `${reclamosPendientes} reclamos pendientes`
                : 'Ir a reclamos'
            }
          >
            <IconBell />
            {reclamosPendientes > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            )}
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className={actionClassName}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </header>
  )
}
