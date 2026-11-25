import { cn } from '../../utils/ui'

const TONES = {
  neutral: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
  brand: 'text-slate-500 hover:bg-brand-50 hover:text-brand-700',
  danger: 'text-slate-500 hover:bg-red-50 hover:text-red-600',
  attention: 'text-amber-600 hover:bg-amber-50 hover:text-amber-700',
  success: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100',
}

/**
 * Botón de ícono con tooltip propio (visible también cuando está deshabilitado,
 * para explicar el motivo).
 */
export default function IconButton({
  label,
  icon: Icon,
  onClick,
  tone = 'neutral',
  disabled = false,
  size = 'md',
  className = '',
}) {
  const dims = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'

  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-35',
          dims,
          TONES[tone] ?? TONES.neutral,
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 z-30 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-pop transition-opacity delay-150 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
