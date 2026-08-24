import { Link } from 'react-router-dom'

const THEMES = {
  indigo: {
    countPill: 'bg-brand-100 text-brand-800',
    footer: 'text-brand-700 hover:bg-brand-50',
    iconWrap: 'bg-brand-50 text-brand-600',
  },
  slate: {
    countPill: 'bg-slate-100 text-slate-600',
    footer: 'text-slate-700 hover:bg-slate-50',
    iconWrap: 'bg-slate-100 text-slate-600',
  },
  red: {
    countPill: 'bg-red-100 text-red-700',
    footer: 'text-red-700 hover:bg-red-50',
    iconWrap: 'bg-red-50 text-red-600',
  },
}

const BADGE_TONOS = {
  indigo: 'bg-brand-50 text-brand-700 ring-brand-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200',
}

function IconWrench({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608"
      />
    </svg>
  )
}

function IconCalendar({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  )
}

const ICONS = {
  wrench: IconWrench,
  calendar: IconCalendar,
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
      className={`group flex items-start gap-2.5 border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/80 ${
        compact ? 'px-3.5 py-2.5' : 'gap-3 px-4 py-3.5 sm:px-5'
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
  icon,
  children,
}) {
  const t = THEMES[tono] ?? THEMES.slate
  const Icono = ICONS[icon]

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div
        className={`flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 ${
          compact ? 'px-3.5 py-2.5' : 'gap-3 px-5 py-3.5'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {Icono && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.iconWrap}`}>
              <Icono className="h-3.5 w-3.5" />
            </span>
          )}
          <h3 className="truncate text-sm font-semibold tracking-tight text-slate-800">{titulo}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${t.countPill}`}>
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
        <ul className={`min-h-0 overflow-y-auto ${compact ? 'max-h-[13rem]' : ''}`}>
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
