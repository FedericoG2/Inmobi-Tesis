import IconButton from '../ui/IconButton'
import { IconCheckCircle, IconEye, IconTrash } from '../icons/Icons'

export default function ContratoRowActions({ onView, onFinalize, onAnular, finalizeLabel = 'Finalizar' }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {onView && <IconButton label="Ver ficha" icon={IconEye} onClick={onView} />}
      {onFinalize && <IconButton label={finalizeLabel} icon={IconCheckCircle} tone="brand" onClick={onFinalize} />}
      {onAnular && <IconButton label="Eliminar" icon={IconTrash} tone="danger" onClick={onAnular} />}
    </div>
  )
}
