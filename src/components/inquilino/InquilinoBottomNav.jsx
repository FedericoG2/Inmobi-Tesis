import { NavLink } from 'react-router-dom'
import { inquilinoNavItems } from './inquilinoNavItems'

export default function InquilinoBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none lg:hidden"
      aria-label="Navegación principal"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-1 rounded-full bg-white px-2 py-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
        {inquilinoNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-brand-600' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-brand-100' : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
