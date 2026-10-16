import { useEffect, useState } from 'react'
import { contarPropiedadesPorPropietario } from '../../services/propietariosService'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import { BADGE_PROPIETARIO_TIPO } from '../../utils/adminModuleUi'
import { IconBuilding, IconEnvelope, IconHome, IconIdCard, IconPhone, IconPin } from '../icons/Icons'
import DetalleFila from '../ui/DetailField'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { IconPencil } from '../icons/Icons'

function iniciales(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  }
  return (nombre ?? '??').slice(0, 2).toUpperCase()
}

function etiquetaPropiedades(cantidad) {
  if (cantidad === 0) return 'Sin propiedades asociadas'
  if (cantidad === 1) return '1 propiedad asociada'
  return `${cantidad} propiedades asociadas`
}

export default function PropietarioDetalleModal({ open, propietario, onClose, onEdit }) {
  const [cantidadPropiedades, setCantidadPropiedades] = useState(null)
  const [cargandoPropiedades, setCargandoPropiedades] = useState(false)

  useEffect(() => {
    if (!open || !propietario?.id) {
      setCantidadPropiedades(null)
      setCargandoPropiedades(false)
      return
    }

    let activo = true
    setCargandoPropiedades(true)
    setCantidadPropiedades(null)

    contarPropiedadesPorPropietario(propietario.id).then((resultado) => {
      if (!activo) return
      setCargandoPropiedades(false)
      if (resultado.error) {
        setCantidadPropiedades(null)
        return
      }
      setCantidadPropiedades(resultado.propiedades)
    })

    return () => {
      activo = false
    }
  }, [open, propietario?.id])

  if (!open || !propietario) return null

  const estilo = BADGE_PROPIETARIO_TIPO[propietario.tipo_persona] ?? BADGE_PROPIETARIO_TIPO['Física']
  const esJuridica = propietario.tipo_persona === 'Jurídica'

  const textoPropiedades = cargandoPropiedades
    ? 'Consultando...'
    : cantidadPropiedades === null
      ? 'No disponible'
      : etiquetaPropiedades(cantidadPropiedades)

  return (
    <Modal open={open} onClose={onClose} size="2xl" labelledBy="propietario-detalle-titulo">
      <ModalHeader
        titleId="propietario-detalle-titulo"
        title={propietario.nombre_completo}
        onClose={onClose}
        media={
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center text-sm font-semibold ${estilo.avatarClass}`}
          >
            {esJuridica ? <IconBuilding className="h-5 w-5" /> : iniciales(propietario.nombre_completo)}
          </span>
        }
      >
        <span className={`${estilo.className} mt-1.5`}>{estilo.label}</span>
      </ModalHeader>

      <ModalBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetalleFila
            label={esJuridica ? 'CUIT' : 'DNI / CUIT'}
            value={formatearDniCuit(propietario.dni_cuit)}
            icon={IconIdCard}
          />
          <DetalleFila label="Teléfono" value={formatearTelefono(propietario.telefono)} icon={IconPhone} />
          <DetalleFila label="Email" value={propietario.email ?? '—'} icon={IconEnvelope} />
          <DetalleFila label="Domicilio" value={propietario.domicilio ?? '—'} icon={IconPin} truncateValue={false} />
          <DetalleFila label="Propiedades" value={textoPropiedades} icon={IconHome} className="sm:col-span-2" />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {onEdit && (
          <Button
            icon={IconPencil}
            onClick={() => {
              onClose()
              onEdit(propietario)
            }}
          >
            Editar
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
