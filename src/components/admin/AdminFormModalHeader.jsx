import { ModalHeader } from '../ui/Modal'
import { IconPencil, IconPlus } from '../icons/Icons'
import { iconTileClass } from '../../utils/ui'

/**
 * Encabezado de los formularios de alta/edición. Mismo lenguaje que el resto de los modales:
 * fondo blanco, ícono en recuadro de marca y título.
 */
export default function AdminFormModalHeader({ title, titleId, icon, subtitle, onClose, editing }) {
  const esEdicion = editing ?? /^editar/i.test(title ?? '')
  const IconoDefault = esEdicion ? IconPencil : IconPlus

  return (
    <ModalHeader
      title={title}
      titleId={titleId}
      subtitle={subtitle}
      onClose={onClose}
      media={<span className={iconTileClass('brand')}>{icon ?? <IconoDefault className="h-5 w-5" />}</span>}
    />
  )
}
