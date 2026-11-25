import IconButton from '../ui/IconButton'
import { IconCheck, IconClipboardCheck, IconClock, IconEye } from '../icons/Icons'

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
    <div className="flex items-center justify-center gap-0.5">
      {onView && <IconButton label="Ver detalle del cálculo" icon={IconEye} onClick={onView} disabled={disabled} />}
      {onHistory && (
        <IconButton label="Ver historial de aumentos" icon={IconClock} onClick={onHistory} disabled={disabled} />
      )}
      {onConfirm && puedeConfirmar && onToggleRevisado && (
        <IconButton
          label={revisado ? 'Revisado — clic para desmarcar' : 'Marcar cálculo como revisado'}
          icon={IconClipboardCheck}
          tone={revisado ? 'success' : 'attention'}
          onClick={onToggleRevisado}
          disabled={disabled}
        />
      )}
      {onConfirm && (
        <IconButton
          label={confirmLabel}
          icon={IconCheck}
          tone="brand"
          onClick={onConfirm}
          disabled={disabled || !confirmHabilitado}
        />
      )}
    </div>
  )
}
