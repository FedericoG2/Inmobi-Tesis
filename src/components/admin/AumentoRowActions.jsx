function ActionButton({ label, className, children, onClick, disabled = false }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        className={className}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  )
}

function IconEye({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function IconCheck({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

const btnBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40'

export default function AumentoRowActions({
  onView,
  onConfirm,
  puedeConfirmar,
  confirmDisabledLabel = 'Confirmar aumento',
  disabled = false,
}) {
  const confirmLabel = puedeConfirmar ? 'Confirmar aumento' : confirmDisabledLabel

  return (
    <div className="flex items-center justify-center gap-1.5">
      {onView && (
        <ActionButton
          label="Ver detalle del cálculo"
          className={`${btnBase} border-sky-400 text-sky-600 hover:bg-sky-50`}
          onClick={onView}
          disabled={disabled}
        >
          <IconEye />
        </ActionButton>
      )}
      {onConfirm && (
        <ActionButton
          label={confirmLabel}
          className={`${btnBase} border-indigo-400 text-indigo-600 hover:bg-indigo-50 disabled:border-slate-300 disabled:text-slate-400`}
          onClick={onConfirm}
          disabled={disabled || !puedeConfirmar}
        >
          <IconCheck />
        </ActionButton>
      )}
    </div>
  )
}
