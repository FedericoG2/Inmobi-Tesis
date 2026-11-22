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
  IconCurrency,
  IconHome,
  IconTrendingUp,
  IconUserGroup,
  IconUsers,
  IconWrench,
  IconX,
} from '../../components/icons/Icons'
import { useAdminLayout } from '../../contexts/AdminLayoutContext'
import { useAuth } from '../../contexts/AuthContext'
import { buttonClass } from '../../utils/ui'

const seccionesCuentas = [
  {
    titulo: null,
    items: [{ to: '/cuentas', label: 'Cuentas', icon: IconUsers }],
  },
]

const seccionesEncargado = [
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
      { to: '/admin/alquileres', label: 'Alquileres', icon: IconCurrency },
      { to: '/admin/aumentos', label: 'Aumentos', icon: IconTrendingUp },
      { to: '/admin/reclamos', label: 'Reclamos', icon: IconWrench },
    ],
  },
]

export default function AdminSidebar() {
  const { sidebarCollapsed, menuMovilAbierto, cerrarMenuMovil } = useAdminLayout()
  const { isAdminSistema } = useAuth()
  const secciones = isAdminSistema ? seccionesCuentas : seccionesEncargado
  const subtitulo = isAdminSistema ? 'Administración de cuentas' : 'Panel del encargado'
  // En móvil el cajón siempre se muestra completo; el modo compacto es solo de escritorio.
  const compacto = sidebarCollapsed && !menuMovilAbierto

  return (
    <>
      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={cerrarMenuMovil}
          className="fixed inset-0 z-30 animate-overlay-in bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col border-r border-slate-200/80 bg-white transition-[transform,width,visibility] duration-200 ease-in-out lg:z-30 lg:translate-x-0 lg:shadow-none ${
          menuMovilAbierto ? 'translate-x-0 shadow-modal' : 'max-lg:invisible -translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
        aria-label="Menú lateral"
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-slate-200/80 ${
            compacto ? 'justify-center px-2' : 'gap-2.5 pl-5 pr-3'
          }`}
        >
          <span className={brandLogoSmClass} aria-hidden>
            <InmobiLogoMark className="h-4 w-4" />
          </span>
          {!compacto && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Inmobi</p>
              <p className="truncate text-xs text-slate-500">{subtitulo}</p>
            </div>
          )}
          {menuMovilAbierto && (
            <button
              type="button"
              onClick={cerrarMenuMovil}
              className={`${buttonClass({ variant: 'ghost', size: 'icon' })} lg:hidden`}
              aria-label="Cerrar menú"
            >
              <IconX className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {secciones.map(({ titulo, items }, idx) => (
            <div key={titulo ?? idx}>
              {titulo && !compacto && (
                <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{titulo}</p>
              )}
              {titulo && compacto && <div className="mx-auto mb-2 h-px w-6 bg-slate-200" aria-hidden />}
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={cerrarMenuMovil}
                    title={compacto ? label : undefined}
                    className={({ isActive }) =>
                      `${brandNavItemClass} ${compacto ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2.5 lg:py-2'} ${
                        isActive ? brandNavActiveClass : brandNavIdleClass
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                        />
                        {!compacto && <span className="truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
