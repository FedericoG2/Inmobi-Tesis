import IconButton from '../ui/IconButton'
import { IconClipboard, IconEye, IconPencil, IconTrash } from '../icons/Icons'

export default function ReclamoRowActions({ onView, onManage, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {onView && <IconButton label="Ver detalle" icon={IconEye} onClick={onView} />}
      {onManage && <IconButton label="Gestionar" icon={IconClipboard} tone="brand" onClick={onManage} />}
      {onEdit && <IconButton label="Editar" icon={IconPencil} tone="brand" onClick={onEdit} />}
      {onDelete && <IconButton label="Eliminar" icon={IconTrash} tone="danger" onClick={onDelete} />}
    </div>
  )
}
