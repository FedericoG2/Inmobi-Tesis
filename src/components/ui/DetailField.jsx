import { cn } from '../../utils/ui'

/**
 * Dato de ficha (label + valor) con ícono. Usado en todos los modales de detalle.
 */
export default function DetailField({
  label,
  value,
  icon: Icon,
  action,
  children,
  className = '',
  truncateValue = true,
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2.5', className)}>
      {Icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-400 ring-1 ring-inset ring-slate-200/80">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p
            className={cn('text-sm font-medium text-slate-900', truncateValue ? 'truncate' : 'break-words')}
            title={truncateValue && typeof value === 'string' ? value : undefined}
          >
            {value}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
