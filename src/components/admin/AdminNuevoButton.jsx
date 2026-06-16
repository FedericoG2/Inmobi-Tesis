import { Button } from '@tremor/react'

export default function AdminNuevoButton({ label, onClick, className = '', variant = 'default', disabled = false }) {
  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex h-10 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:border-indigo-700 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:border-slate-300 disabled:hover:bg-slate-200 ${className}`}
      >
        {label}
      </button>
    )
  }

  return (
    <Button
      size="xs"
      onClick={onClick}
      className={`!px-3 !py-1.5 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </Button>
  )
}
