import { NavLink } from 'react-router-dom'
import { inquilinoNavItems } from './inquilinoNavItems'

export default function InquilinoBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {inquilinoNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 pb-2 pt-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute inset-x-6 top-0 h-0.5 rounded-full transition-colors ${
                    isActive ? 'bg-brand-600' : 'bg-transparent'
                  }`}
                  aria-hidden
                />
                <Icon className="h-5 w-5" />
                <span className="truncate leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
