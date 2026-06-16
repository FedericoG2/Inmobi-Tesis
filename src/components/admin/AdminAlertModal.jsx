import { Button } from '@tremor/react'

export default function AdminAlertModal({
  open,
  title = 'Atención',
  message,
  children,
  onClose,
  compact = false,
  wide = false,
  variant = 'warning',
}) {
  if (!open) return null

  const iconClass =
    variant === 'info'
      ? 'bg-sky-100 text-sky-600'
      : 'bg-amber-100 text-amber-600'

  const widthClass = wide
    ? 'max-w-3xl'
    : compact
      ? 'max-w-sm'
      : 'max-w-md'

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
        className={`relative z-10 w-full rounded-2xl bg-white p-5 shadow-xl ${widthClass}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
          >
            {variant === 'info' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            )}
          </span>
          <h2 id="admin-alert-title" className="min-w-0 flex-1 text-base font-semibold text-slate-900">
            {title}
          </h2>
        </div>

        {(children || message) && (
          <div className="mt-3 text-sm leading-relaxed text-slate-600">
            {children ?? <p>{message}</p>}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </div>
  )
}
