export const toolbarInputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50'

const selectBaseClass =
  'h-10 w-full cursor-pointer appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 shrink-0'

const selectInactivoClass = 'border-slate-200 text-slate-700 focus:border-emerald-500'
const selectActivoClass =
  'border-emerald-300 text-emerald-800 font-medium ring-1 ring-emerald-100 focus:border-emerald-500'

function IconChevronDown({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function IconX({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

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
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${selectBaseClass} ${activo ? selectActivoClass : selectInactivoClass}`}
      >
        {children}
      </select>
      {mostrarClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar filtro"
          title="Quitar filtro"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-100"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      ) : (
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
    </div>
  )
}
