import { NavLink } from 'react-router-dom'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import InmobiLogoMark from '../brand/InmobiLogoMark'
import { brandLogoMdClass, brandNavActiveRingClass } from '../../utils/brandUi'
import { inquilinoNavItems } from './inquilinoNavItems'

export default function InquilinoSidebar() {
  const { inquilino } = usePortalInquilino()
  const nombreCompleto = inquilino?.nombre_completo?.trim() || 'Inquilino'

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
        <span className={brandLogoMdClass} aria-hidden>          <InmobiLogoMark className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">INMOBI</p>
          <p className="truncate text-[11px] font-medium text-slate-500">{nombreCompleto}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {inquilinoNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? brandNavActiveRingClass
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
