import { NavLink } from 'react-router-dom'
import InmobiLogoMark from '../../components/brand/InmobiLogoMark'
import {
  IconBuilding,
  IconClipboard,
  IconHome,
  IconTrendingUp,
  IconUserGroup,
  IconUsers,
  IconWrench,
} from '../../components/icons/NavIcons'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/admin/propietarios', label: 'Propietarios', icon: IconUserGroup },
  { to: '/admin/propiedades', label: 'Propiedades', icon: IconBuilding },
  { to: '/admin/inquilinos', label: 'Inquilinos', icon: IconUsers },
  { to: '/admin/contratos', label: 'Contratos', icon: IconClipboard },
  { to: '/admin/aumentos', label: 'Aumentos', icon: IconTrendingUp },
  { to: '/admin/reclamos', label: 'Reclamos', icon: IconWrench },
]

export default function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 shadow-sm shadow-slate-200/60">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm ring-1 ring-indigo-600/20"
          aria-hidden
        >
          <InmobiLogoMark className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-slate-900">INMOBI</p>
          <p className="truncate text-[11px] font-medium text-slate-500">Panel administrador</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
