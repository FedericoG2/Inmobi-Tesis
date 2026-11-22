import { NavLink } from 'react-router-dom'
import InmobiLogoMark from '../brand/InmobiLogoMark'
import {
  brandAvatarClass,
  brandLogoSmClass,
  brandNavActiveClass,
  brandNavIdleClass,
  brandNavItemClass,
} from '../../utils/brandUi'

function iniciales(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  return (nombre ?? '?').slice(0, 1).toUpperCase()
}

/** Menú lateral de los portales (inquilino y propietario) en escritorio. */
export default function PortalSidebar({ items, subtitulo, nombre, rolLabel }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200/80 bg-white lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200/80 px-5">
        <span className={brandLogoSmClass} aria-hidden>
          <InmobiLogoMark className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Inmobi</p>
          <p className="truncate text-xs text-slate-500">{subtitulo}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${brandNavItemClass} gap-2.5 px-2.5 py-2 ${isActive ? brandNavActiveClass : brandNavIdleClass}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-slate-200/80 px-5 py-3.5">
        <span className={`${brandAvatarClass} h-8 w-8 text-xs`} aria-hidden>
          {iniciales(nombre || rolLabel)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-slate-900">{nombre || rolLabel}</p>
          <p className="truncate text-xs text-slate-500">{rolLabel}</p>
        </div>
      </div>
    </aside>
  )
}
