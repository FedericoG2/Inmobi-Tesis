export default function AdminNuevoButton({ label, onClick, className = '', variant = 'primary', disabled = false }) {
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:border-brand-700 hover:bg-brand-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:border-slate-300 disabled:hover:bg-slate-200 ${className}`}
      >
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-lg border border-brand-600 bg-brand-600 px-4 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:border-brand-700 hover:bg-brand-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:border-slate-300 disabled:hover:bg-slate-200 ${className}`}
    >
      {label}
    </button>
  )
}
