import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { IconAlert, IconInfo } from '../icons/Icons'
import { iconTileClass } from '../../utils/ui'

export default function AdminAlertModal({
  open,
  title = 'Atención',
  message,
  children,
  onClose,
  compact = false,
  wide = false,
  variant = 'warning',
  apilado = false,
}) {
  const esInfo = variant === 'info'
  const Icon = esInfo ? IconInfo : IconAlert
  const size = wide ? '3xl' : compact ? 'sm' : 'md'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      layer={apilado ? 'top' : 'base'}
      role="alertdialog"
      labelledBy="admin-alert-title"
    >
      <div className="min-h-0 overflow-y-auto px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span className={`${iconTileClass(esInfo ? 'brand' : 'warning', 'lg', 'circle')}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="admin-alert-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {(children || message) && (
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{children ?? <p>{message}</p>}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
        <Button onClick={onClose}>Entendido</Button>
      </div>
    </Modal>
  )
}
