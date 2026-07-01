import { Link } from 'react-router-dom'
import {
  IconBuilding,
  IconClipboard,
  IconTrendingUp,
  IconUsers,
  IconWrench,
} from '../icons/NavIcons'

const ACCIONES = [
  {
    to: '/admin/contratos',
    label: 'Contratos',
    icon: IconClipboard,
    descripcion: 'Gestionar alquileres',
  },
  {
    to: '/admin/aumentos',
    label: 'Aumentos',
    icon: IconTrendingUp,
    descripcion: 'Confirmar ajustes',
  },
  {
    to: '/admin/reclamos',
    label: 'Reclamos',
    icon: IconWrench,
    descripcion: 'Atender urgencias',
  },
  {
    to: '/admin/inquilinos',
    label: 'Inquilinos',
    icon: IconUsers,
    descripcion: 'Ver inquilinos',
  },
  {
    to: '/admin/propiedades',
    label: 'Propiedades',
    icon: IconBuilding,
    descripcion: 'Cartera inmobiliaria',
  },
]

export default function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCIONES.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-100 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          {label}
        </Link>
      ))}
    </div>
  )
}
