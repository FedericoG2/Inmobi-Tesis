import { Link } from 'react-router-dom'

const THEMES = {
  amber: {
    countPill: 'bg-amber-100 text-amber-800',
    footer: 'text-amber-700 hover:bg-amber-50',
  },
  red: {
    countPill: 'bg-red-100 text-red-800',
    footer: 'text-red-700 hover:bg-red-50',
  },
}

const BADGE_TONOS = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
}

function IconoFlecha({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

const DOT_TONOS = {
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function DashboardInboxItem({ titulo, subtitulo, badge, badgeTono = 'slate' }) {
  return (
    <li className="group flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-slate-50/80 sm:px-5">
      <span
        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT_TONOS[badgeTono] ?? 'bg-indigo-500'}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-900">
            {titulo}
          </p>
          {badge && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONOS[badgeTono] ?? BADGE_TONOS.slate}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitulo && (
          <p className="mt-1 truncate text-xs text-slate-500" title={subtitulo}>
            {subtitulo}
          </p>
        )}
      </div>
    </li>
  )
}

export default function DashboardAlertPanel({
  titulo,
  cantidad,
  linkTo,
  linkLabel,
  vacio,
  vacioMensaje = 'Nada pendiente por ahora.',
  tono = 'amber',
  children,
}) {
  const t = THEMES[tono] ?? THEMES.amber

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h3 className="truncate text-sm font-semibold text-slate-900">{titulo}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.countPill}`}>
          {cantidad}
        </span>
      </div>

      {vacio ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">{vacioMensaje}</p>
        </div>
      ) : (
        <ul>{children}</ul>
      )}

      <div className="border-t border-slate-100 px-3 py-2.5">
        <Link
          to={linkTo}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${t.footer}`}
        >
          <span>{linkLabel}</span>
          <IconoFlecha />
        </Link>
      </div>
    </div>
  )
}

export { BADGE_TONOS }
