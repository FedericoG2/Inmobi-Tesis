import { Link } from 'react-router-dom'

const THEMES = {
  indigo: {
    countPill: 'bg-brand-100 text-brand-800',
    footer: 'text-brand-700 hover:bg-brand-50',
  },
  slate: {
    countPill: 'bg-slate-100 text-slate-700',
    footer: 'text-slate-700 hover:bg-slate-50',
  },
  red: {
    countPill: 'bg-red-100 text-red-800',
    footer: 'text-red-700 hover:bg-red-50',
  },
}

const BADGE_TONOS = {
  indigo: 'bg-brand-50 text-brand-700 ring-brand-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200',
}

function IconoFlecha({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

const DOT_TONOS = {
  indigo: 'bg-brand-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
}

export function DashboardInboxItem({ titulo, subtitulo, badge, badgeTono = 'slate', compact = false }) {
  return (
    <li
      className={`group flex items-start gap-2 border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/80 ${
        compact ? 'px-3 py-2' : 'gap-3 px-4 py-3.5 sm:px-5'
      }`}
    >
      <span
        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT_TONOS[badgeTono] ?? 'bg-brand-500'}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-900">
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
  tono = 'slate',
  compact = false,
  children,
}) {
  const t = THEMES[tono] ?? THEMES.slate

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div
        className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 ${
          compact ? 'px-3 py-2' : 'gap-3 px-5 py-3.5'
        }`}
      >
        <h3 className={`truncate font-semibold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>
          {titulo}
        </h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${t.countPill}`}>
          {cantidad}
        </span>
      </div>

      {vacio ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center text-center ${
            compact ? 'px-3 py-5' : 'px-5 py-10'
          }`}
        >
          <div
            className={`mb-2 flex items-center justify-center rounded-full bg-slate-100 ${
              compact ? 'h-8 w-8' : 'mb-3 h-12 w-12'
            }`}
          >
            <svg
              className={`text-slate-400 ${compact ? 'h-4 w-4' : 'h-6 w-6'}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className={`text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{vacioMensaje}</p>
        </div>
      ) : (
        <ul className={`min-h-0 flex-1 overflow-y-auto ${compact ? 'max-h-[9.5rem]' : ''}`}>
          {children}
        </ul>
      )}

      <div className={`shrink-0 border-t border-slate-100 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
        <Link
          to={linkTo}
          className={`flex items-center justify-between rounded-lg font-medium transition-colors ${
            compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
          } ${t.footer}`}
        >
          <span>{linkLabel}</span>
          <IconoFlecha className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Link>
      </div>
    </div>
  )
}

export { BADGE_TONOS }
