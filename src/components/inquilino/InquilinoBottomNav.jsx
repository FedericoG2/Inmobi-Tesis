import { NavLink } from 'react-router-dom'
import { IconDocument, IconHome, IconWrench } from '../icons/NavIcons'

const navItems = [
  { to: '/inquilino/dashboard', label: 'Inicio', icon: IconHome },
  { to: '/inquilino/reclamos', label: 'Reclamos', icon: IconWrench },
  { to: '/inquilino/documentos', label: 'Docs', icon: IconDocument },
]

export default function InquilinoBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 pb-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`
            }
          >
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
