import { Link } from 'react-router-dom'
import { IconArrowRight, IconCalendar, IconCheckCircle, IconWrench } from '../icons/Icons'
import { badgeClass, cn, dotTones, iconTileClass, surfaceCard } from '../../utils/ui'

/** Tonos históricos → tonos semánticos del sistema. */
const TONO = {
  indigo: 'brand',
  red: 'danger',
  slate: 'neutral',
}

const ICONS = {
  wrench: IconWrench,
  calendar: IconCalendar,
}

export function DashboardInboxItem({ titulo, subtitulo, badge, badgeTono = 'slate' }) {
  const tono = TONO[badgeTono] ?? 'neutral'

  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70">
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', dotTones[tono])} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-medium text-slate-900">{titulo}</p>
          {badge && <span className={badgeClass(tono)}>{badge}</span>}
        </div>
        {subtitulo && (
          <p className="mt-0.5 truncate text-xs text-slate-500" title={subtitulo}>
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
  icon,
  children,
}) {
  const t = TONO[tono] ?? 'neutral'
  const Icono = ICONS[icon]

  return (
    <div className={cn(surfaceCard, 'flex flex-col overflow-hidden')}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icono && (
            <span className={iconTileClass(t, 'sm')}>
              <Icono className="h-4 w-4" />
            </span>
          )}
          <h3 className="truncate text-sm font-semibold text-slate-900">{titulo}</h3>
        </div>
        <span className={badgeClass(cantidad > 0 ? t : 'neutral', 'tabular-nums')}>{cantidad}</span>
      </div>

      {vacio ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <IconCheckCircle className="h-6 w-6 text-emerald-500" />
          <p className="text-sm text-slate-500">{vacioMensaje}</p>
        </div>
      ) : (
        <ul className="max-h-[13.5rem] min-h-0 divide-y divide-slate-100 overflow-y-auto">{children}</ul>
      )}

      <Link
        to={linkTo}
        className="group flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700"
      >
        <span>{linkLabel}</span>
        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
