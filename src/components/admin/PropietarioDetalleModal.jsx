import { useConsulta } from '../../hooks/useConsulta'
import { listarPropiedadesDePropietario } from '../../services/propietariosService'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import { BADGE_INQUILINO_PORTAL, BADGE_PROPIEDAD_ESTADO, BADGE_PROPIEDAD_ESTADO_DEFAULT, BADGE_PROPIETARIO_TIPO } from '../../utils/adminModuleUi'
import { eyebrow } from '../../utils/ui'
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
  const consulta = useConsulta(open && propietario?.id ? propietario.id : null, () =>
    listarPropiedadesDePropietario(propietario.id)
  )
  const propiedades = consulta.data
  const cantidadPropiedades = propiedades ? propiedades.length : null
  const cargandoPropiedades = consulta.cargando

  if (!open || !propietario) return null

  const estilo = BADGE_PROPIETARIO_TIPO[propietario.tipo_persona] ?? BADGE_PROPIETARIO_TIPO['Física']
  const esJuridica = propietario.tipo_persona === 'Jurídica'
  // Acceso al portal del propietario: lo habilita el Administrador de sistema creando la cuenta.
  const badgePortal = propietario.perfil_id ? BADGE_INQUILINO_PORTAL.activo : BADGE_INQUILINO_PORTAL.inactivo

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
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={estilo.className}>{estilo.label}</span>
          <span className={badgePortal.className}>{badgePortal.label}</span>
        </div>
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

        {propiedades?.length > 0 && (
          <section className="mt-5">
            <h3 className={`${eyebrow} mb-2`}>Propiedades asociadas</h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {propiedades.map((p) => {
                const estadoProp = BADGE_PROPIEDAD_ESTADO[p.estado] ?? { ...BADGE_PROPIEDAD_ESTADO_DEFAULT, label: p.estado }
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900" title={p.direccion}>
                        {p.direccion}
                      </p>
                      <p className="text-xs text-slate-500">{p.tipo}</p>
                    </div>
                    <span className={estadoProp.className}>{estadoProp.label}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
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
