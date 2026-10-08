import { NavLink } from 'react-router-dom'
import InmobiLogoMark from '../../components/brand/InmobiLogoMark'
import {
  brandLogoSmClass,
  brandNavActiveClass,
  brandNavIdleClass,
  brandNavItemClass,
} from '../../utils/brandUi'
import {
  IconBuilding,
  IconClipboard,
  IconHome,
  IconTrendingUp,
  IconUserGroup,
  IconUsers,
  IconWrench,
} from '../../components/icons/Icons'
import { useAdminLayout } from '../../contexts/AdminLayoutContext'

const secciones = [
  {
    titulo: null,
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: IconHome }],
  },
  {
    titulo: 'Cartera',
    items: [
      { to: '/admin/propietarios', label: 'Propietarios', icon: IconUserGroup },
      { to: '/admin/propiedades', label: 'Propiedades', icon: IconBuilding },
      { to: '/admin/inquilinos', label: 'Inquilinos', icon: IconUsers },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { to: '/admin/contratos', label: 'Contratos', icon: IconClipboard },
      { to: '/admin/aumentos', label: 'Aumentos', icon: IconTrendingUp },
      { to: '/admin/reclamos', label: 'Reclamos', icon: IconWrench },
    ],
  },
]

export default function AdminSidebar() {
  const { sidebarCollapsed } = useAdminLayout()

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-slate-200/80 bg-white transition-[width] duration-200 ease-in-out ${
        sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b border-slate-200/80 ${
          sidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-5'
        }`}
      >
        <span className={brandLogoSmClass} aria-hidden>
          <InmobiLogoMark className="h-4 w-4" />
        </span>
        {!sidebarCollapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Inmobi</p>
            <p className="truncate text-xs text-slate-500">Panel administrador</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {secciones.map(({ titulo, items }, idx) => (
          <div key={titulo ?? idx}>
            {titulo && !sidebarCollapsed && (
              <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{titulo}</p>
            )}
            {titulo && sidebarCollapsed && <div className="mx-auto mb-2 h-px w-6 bg-slate-200" aria-hidden />}
            <div className="space-y-0.5">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    `${brandNavItemClass} ${sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2'} ${
                      isActive ? brandNavActiveClass : brandNavIdleClass
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                      />
                      {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
