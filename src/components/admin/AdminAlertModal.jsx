import { Button } from '@tremor/react'

export default function AdminAlertModal({
  open,
  title = 'Atención',
  message,
  children,
  onClose,
  compact = false,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar alerta"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-alert-title"
        className={`relative z-10 w-full rounded-2xl bg-white p-5 shadow-xl ${
          compact ? 'max-w-sm' : 'max-w-md'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="admin-alert-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {children ?? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </div>
  )
}
