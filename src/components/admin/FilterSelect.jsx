import { IconChevronDown, IconX } from '../icons/Icons'
import { cn, selectClass } from '../../utils/ui'

const selectActivoClass = '!border-brand-300 bg-brand-50/40 font-medium text-brand-800'

export default function FilterSelect({
  id,
  value,
  onChange,
  onClear,
  ariaLabel,
  className = 'sm:w-44',
  clearValue = '',
  disabled = false,
  children,
}) {
  const activo = value !== clearValue
  const mostrarClear = activo && onClear

  return (
    <div className={`relative shrink-0 ${className}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(selectClass, activo ? selectActivoClass : 'text-slate-700')}
      >
        {children}
      </select>
      {mostrarClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar filtro"
          title="Quitar filtro"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-brand-600 transition hover:bg-brand-100"
        >
          <IconX className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : (
        <IconChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
        />
      )}
    </div>
  )
}
