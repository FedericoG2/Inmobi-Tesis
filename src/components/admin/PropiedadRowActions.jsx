import IconButton from '../ui/IconButton'
import { IconEye, IconPencil, IconTrash } from '../icons/Icons'

export default function PropiedadRowActions({ onEdit, onDelete, onView }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {onView && <IconButton label="Ver detalle" icon={IconEye} onClick={onView} />}
      {onEdit && <IconButton label="Editar" icon={IconPencil} tone="brand" onClick={onEdit} />}
      {onDelete && <IconButton label="Eliminar" icon={IconTrash} tone="danger" onClick={onDelete} />}
    </div>
  )
}
