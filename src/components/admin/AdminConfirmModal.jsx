import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { IconAlert, IconInfo } from '../icons/Icons'
import { calloutClass, iconTileClass } from '../../utils/ui'

const VARIANTES = {
  danger: { boton: 'danger', tono: 'danger', icon: IconAlert },
  warning: { boton: 'warning', tono: 'warning', icon: IconAlert },
  important: { boton: 'primary', tono: 'brand', icon: IconInfo },
  primary: { boton: 'primary', tono: null, icon: null },
}

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
  const v = VARIANTES[confirmVariant] ?? VARIANTES.primary
  const Icon = v.icon
  const esImportante = confirmVariant === 'important'

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      size="md"
      layer={apilado ? 'stacked' : 'base'}
      role="alertdialog"
      labelledBy="admin-confirm-title"
    >
      <div className="flex items-start gap-4 px-6 pb-5 pt-6">
        {Icon ? (
          <span className={`${iconTileClass(v.tono, 'lg', 'circle')}`}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 id="admin-confirm-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {esImportante ? (
            <div className={calloutClass('info', 'mt-3')}>{message}</div>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={v.boton} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
