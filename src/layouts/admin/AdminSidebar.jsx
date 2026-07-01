import { NavLink } from 'react-router-dom'
import InmobiLogoMark from '../../components/brand/InmobiLogoMark'
import {
  brandLogoSmClass,
  brandNavActiveClass,
} from '../../utils/brandUi'
import {
  IconBuilding,
  IconClipboard,
  IconHome,
  IconTrendingUp,
  IconUserGroup,
  IconUsers,
  IconWrench,
} from '../../components/icons/NavIcons'
import { useAdminLayout } from '../../contexts/AdminLayoutContext'

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
  const { sidebarCollapsed } = useAdminLayout()

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out ${
        sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b border-slate-200 shadow-sm shadow-slate-200/60 ${
          sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
        }`}
      >
        <span className={brandLogoSmClass} aria-hidden>
          <InmobiLogoMark className="h-4 w-4" />
        </span>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">INMOBI</p>
            <p className="truncate text-[10px] font-medium text-slate-500">Panel administrador</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-colors ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
              } ${
                isActive
                  ? brandNavActiveClass
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
