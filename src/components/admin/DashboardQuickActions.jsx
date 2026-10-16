import { Link } from 'react-router-dom'
import {
  IconBuilding,
  IconClipboard,
  IconTrendingUp,
  IconUsers,
  IconWrench,
} from '../icons/Icons'
import { buttonClass } from '../../utils/ui'

const ACCIONES = [
  { to: '/admin/contratos', label: 'Contratos', icon: IconClipboard },
  { to: '/admin/aumentos', label: 'Aumentos', icon: IconTrendingUp },
  { to: '/admin/reclamos', label: 'Reclamos', icon: IconWrench },
  { to: '/admin/inquilinos', label: 'Inquilinos', icon: IconUsers },
  { to: '/admin/propiedades', label: 'Propiedades', icon: IconBuilding },
]

export default function DashboardQuickActions() {
  return (
    <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-2">
      {ACCIONES.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
