import {
  IconAlert,
  IconBuilding,
  IconCalendar,
  IconChart,
  IconCheckCircle,
  IconClipboard,
  IconTrendingUp,
  IconWrench,
} from '../icons/Icons'
import { cn, iconTileClass, surfaceCard } from '../../utils/ui'

/** Los temas históricos se mapean a los tonos semánticos del sistema. */
const TONO_POR_TEMA = {
  indigo: 'brand',
  sky: 'brand',
  violet: 'brand',
  emerald: 'success',
  amber: 'warning',
  red: 'danger',
  slate: 'neutral',
}

const VALOR_POR_TONO = {
  brand: 'text-slate-900',
  neutral: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-600',
}

const ICONS = {
  building: IconBuilding,
  chart: IconChart,
  clipboard: IconClipboard,
  wrench: IconWrench,
  calendar: IconCalendar,
  alert: IconAlert,
  check: IconCheckCircle,
  trending: IconTrendingUp,
}

export default function StatCard({
  label,
  value,
  icon,
  theme = 'indigo',
  hint,
  compact = false,
  onClick,
  ariaLabel,
}) {
  const tono = TONO_POR_TEMA[theme] ?? 'neutral'
  const Icon = ICONS[icon] ?? IconBuilding
  const clickable = typeof onClick === 'function'
  const Wrapper = clickable ? 'button' : 'div'
  const wrapperProps = clickable
    ? {
        type: 'button',
        onClick,
        'aria-label': ariaLabel ?? `${label}. ${hint ?? 'Ver detalle'}`,
      }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        surfaceCard,
        'flex w-full flex-col text-left',
        compact ? 'gap-3 p-4' : 'gap-4 p-5',
        clickable && 'transition hover:border-slate-300 hover:shadow-pop'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <span className={iconTileClass(tono, 'sm')}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p
          className={cn(
            'font-semibold tabular-nums leading-none tracking-tight',
            compact ? 'text-2xl' : 'text-3xl',
            VALOR_POR_TONO[tono]
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-1.5 truncate text-xs text-slate-500">{hint}</p> : null}
      </div>
    </Wrapper>
  )
}
