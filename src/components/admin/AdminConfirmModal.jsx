import { Button } from '@tremor/react'

export default function AdminConfirmModal({
  open,
  title = 'Confirmar',
  message,
  confirmLabel = 'Continuar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
  apilado = false,
}) {
  if (!open) return null

  const confirmClassName =
    confirmVariant === 'danger'
      ? '!border-red-500 !bg-red-600 !text-white hover:!border-red-600 hover:!bg-red-700'
      : confirmVariant === 'warning'
        ? '!border-amber-500 !bg-amber-600 !text-white hover:!border-amber-600 hover:!bg-amber-700'
        : '!border-indigo-500 !bg-indigo-600 !text-white hover:!border-indigo-600 hover:!bg-indigo-700'

  const iconClass =
    confirmVariant === 'warning'
      ? 'bg-amber-100 text-amber-600'
      : confirmVariant === 'danger'
        ? 'bg-red-100 text-red-600'
        : 'bg-indigo-100 text-indigo-600'

  const mostrarIcono = confirmVariant === 'warning' || confirmVariant === 'danger'

  return (
    <div className={`fixed inset-0 ${apilado ? 'z-[60]' : 'z-50'} flex items-center justify-center p-4`}>
      <button
        type="button"
        aria-label="Cerrar confirmación"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onCancel}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        {mostrarIcono ? (
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="admin-confirm-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 id="admin-confirm-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
          </>
        )}

        <div className={`flex justify-end gap-3 ${mostrarIcono ? 'mt-6' : 'mt-6'}`}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
