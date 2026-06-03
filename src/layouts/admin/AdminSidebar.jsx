import { NavLink } from 'react-router-dom'
import {
  IconBuilding,
  IconClipboard,
  IconHome,
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
  { to: '/admin/reclamos', label: 'Reclamos', icon: IconWrench },
]

export default function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-indigo-700">INMOBI</h1>
        <p className="text-xs text-slate-500">Panel Administrador</p>
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
