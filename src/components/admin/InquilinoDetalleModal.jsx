import { useEffect, useState } from 'react'
import { contarDependenciasInquilino } from '../../services/inquilinosService'
import { formatearDniCuit } from '../../utils/normalizarContacto'
import {
  BADGE_INQUILINO_PORTAL,
  BADGE_PERSONA_TIPO,
} from '../../utils/adminModuleUi'
import DetalleFila from '../ui/DetailField'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconDocument,
  IconEnvelope,
  IconIdCard,
  IconPencil,
  IconPhone,
  IconUser,
  IconWrench,
} from '../icons/Icons'

function iniciales(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  }
  return (nombre ?? '??').slice(0, 2).toUpperCase()
}

function valorOpcional(valor) {
  const v = (valor ?? '').trim()
  return v || '—'
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const partes = String(fecha).split('-')
  if (partes.length !== 3) return fecha
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function etiquetaContratos(deps) {
  if (!deps) return 'No disponible'
  const partes = []
  if (deps.contratos_activos > 0) {
    const n = deps.contratos_activos
    partes.push(`${n} contrato${n > 1 ? 's' : ''} activo${n > 1 ? 's' : ''}`)
  }
  if (deps.contratos_historicos > 0) {
    const n = deps.contratos_historicos
    partes.push(`${n} histórico${n > 1 ? 's' : ''}`)
  }
  if (partes.length === 0) return 'Sin contratos asociados'
  return partes.join(' · ')
}

function etiquetaReclamos(cantidad) {
  if (cantidad === 0) return 'Sin reclamos asociados'
  if (cantidad === 1) return '1 reclamo asociado'
  return `${cantidad} reclamos asociados`
}

export default function InquilinoDetalleModal({ open, inquilino, onClose, onEdit, apilado = false }) {
  const [dependencias, setDependencias] = useState(null)
  const [cargandoDeps, setCargandoDeps] = useState(false)

  useEffect(() => {
    if (!open || !inquilino?.id) {
      setDependencias(null)
      setCargandoDeps(false)
      return
    }

    let activo = true
    setCargandoDeps(true)
    setDependencias(null)

    contarDependenciasInquilino(inquilino.id).then((resultado) => {
      if (!activo) return
      setCargandoDeps(false)
      if (resultado.error) {
        setDependencias(null)
        return
      }
      setDependencias(resultado)
    })

    return () => {
      activo = false
    }
  }, [open, inquilino?.id])

  if (!open || !inquilino) return null

  const estiloTipo = BADGE_PERSONA_TIPO[inquilino.tipo_persona] ?? BADGE_PERSONA_TIPO['Física']
  const esJuridica = inquilino.tipo_persona === 'Jurídica'
  const badgePortal = inquilino.perfil_id
    ? BADGE_INQUILINO_PORTAL.activo
    : BADGE_INQUILINO_PORTAL.inactivo

  const textoContratos = cargandoDeps ? 'Consultando...' : etiquetaContratos(dependencias)
  const textoReclamos = cargandoDeps
    ? 'Consultando...'
    : dependencias === null
      ? 'No disponible'
      : etiquetaReclamos(dependencias.reclamos ?? 0)

  const textoEmergencia = [inquilino.emergencia_nombre, inquilino.emergencia_telefono]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join(' · ') || '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      layer={apilado ? 'stacked' : 'base'}
      labelledBy="inquilino-detalle-titulo"
    >
      <ModalHeader
        titleId="inquilino-detalle-titulo"
        title={inquilino.nombre_completo}
        onClose={onClose}
        media={
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center text-sm font-semibold ${estiloTipo.avatarClass}`}
          >
            {esJuridica ? <IconBuilding className="h-5 w-5" /> : iniciales(inquilino.nombre_completo)}
          </span>
        }
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={estiloTipo.className}>{estiloTipo.label}</span>
          <span className={badgePortal.className}>{badgePortal.label}</span>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetalleFila
            label={esJuridica ? 'CUIT' : 'DNI / CUIT'}
            value={formatearDniCuit(inquilino.dni_cuit)}
            icon={IconIdCard}
          />
          <DetalleFila label="Teléfono" value={valorOpcional(inquilino.telefono)} icon={IconPhone} />
          <DetalleFila label="Email" value={inquilino.email ?? '—'} icon={IconEnvelope} />
          <DetalleFila
            label={esJuridica ? 'Rubro' : 'Ocupación'}
            value={valorOpcional(inquilino.ocupacion)}
            icon={IconBriefcase}
          />

          {!esJuridica && (
            <>
              <DetalleFila label="Nacimiento" value={formatearFecha(inquilino.fecha_nacimiento)} icon={IconCalendar} />
              <DetalleFila label="Estado civil" value={inquilino.estado_civil ?? '—'} icon={IconUser} />
            </>
          )}

          <DetalleFila label="Emergencia" value={textoEmergencia} icon={IconPhone} className="sm:col-span-2" />

          {inquilino.observaciones && (
            <DetalleFila
              label="Observaciones"
              value={inquilino.observaciones}
              icon={IconDocument}
              className="sm:col-span-2"
              truncateValue={false}
            />
          )}

          <DetalleFila label="Contratos" value={textoContratos} icon={IconClipboard} />
          <DetalleFila label="Reclamos" value={textoReclamos} icon={IconWrench} />
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
              onEdit(inquilino)
            }}
          >
            Editar
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
