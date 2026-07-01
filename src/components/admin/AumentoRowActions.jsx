function ActionButton({ label, className, children, onClick, disabled = false }) {
  return (
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

function IconClipboardCheck({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M9 3.75H6.75A2.25 2.25 0 0 0 4.5 6v12a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 19.5 18V6a2.25 2.25 0 0 0-2.25-2.25H15m-6 0V4.5A1.5 1.5 0 0 1 10.5 3h3a1.5 1.5 0 0 1 1.5 1.5v-.75m-6 0h6"
      />
    </svg>
  )
}

function IconHistory({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

const btnBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40'

export default function AumentoRowActions({
  onView,
  onHistory,
  onConfirm,
  puedeConfirmar,
  confirmDisabledLabel = 'Confirmar aumento',
  disabled = false,
  revisado = false,
  onToggleRevisado,
}) {
  const confirmHabilitado = puedeConfirmar && revisado
  const confirmLabel = !puedeConfirmar
    ? confirmDisabledLabel
    : revisado
      ? 'Confirmar aumento'
      : 'Marcá el cálculo como revisado primero'

  return (
    <div className="flex items-center justify-center gap-1.5">
      {onView && (
        <ActionButton
          label="Ver detalle del cálculo"
          className={`${btnBase} border-slate-300 text-slate-600 hover:bg-slate-50`}
          onClick={onView}
          disabled={disabled}
        >
          <IconEye />
        </ActionButton>
      )}
      {onHistory && (
        <ActionButton
          label="Ver historial de aumentos"
          className={`${btnBase} border-brand-300 text-brand-600 hover:bg-brand-50`}
          onClick={onHistory}
          disabled={disabled}
        >
          <IconHistory />
        </ActionButton>
      )}
      {onConfirm && puedeConfirmar && onToggleRevisado && (
        <ActionButton
          label={revisado ? 'Revisado — clic para desmarcar' : 'Marcar cálculo como revisado'}
          className={`${btnBase} ${
            revisado
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'border-amber-400 text-amber-600 hover:bg-amber-50'
          }`}
          onClick={onToggleRevisado}
          disabled={disabled}
        >
          <IconClipboardCheck />
        </ActionButton>
      )}
      {onConfirm && (
        <ActionButton
          label={confirmLabel}
          className={`${btnBase} border-brand-300 text-brand-600 hover:bg-brand-50 disabled:border-slate-300 disabled:text-slate-400`}
          onClick={onConfirm}
          disabled={disabled || !confirmHabilitado}
        >
          <IconCheck />
        </ActionButton>
      )}
    </div>
  )
}
