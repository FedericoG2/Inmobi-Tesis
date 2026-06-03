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
}) {
  if (!open) return null

  const confirmClassName =
    confirmVariant === 'danger'
      ? '!border-red-500 !bg-red-600 !text-white hover:!border-red-600 hover:!bg-red-700'
      : '!border-indigo-500 !bg-indigo-600 !text-white hover:!border-indigo-600 hover:!bg-indigo-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar confirmación"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="admin-confirm-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
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
