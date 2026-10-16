import { useEffect, useState } from 'react'
import { contarDependenciasPropiedad } from '../../services/propiedadesService'
import { etiquetaPropietario } from '../../utils/etiquetaPropietario'
import {
  BADGE_PROPIEDAD_ESTADO,
  BADGE_PROPIEDAD_ESTADO_DEFAULT,
  BADGE_PROPIEDAD_TIPO,
  BADGE_PROPIEDAD_TIPO_DEFAULT,
} from '../../utils/adminModuleUi'
import DetalleFila from '../ui/DetailField'
import FichaContratosReclamos from './FichaContratosReclamos'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import {
  IconApartment,
  IconBuilding,
  IconClipboard,
  IconDoor,
  IconHome,
  IconLayers,
  IconPencil,
  IconPin,
  IconStorefront,
  IconUser,
  IconWrench,
} from '../icons/Icons'

const ICONOS_TIPO = {
  Departamento: IconApartment,
  Casa: IconHome,
  'Local comercial': IconStorefront,
}

function tituloPrincipal(propiedad) {
  if (propiedad.calle && propiedad.altura) {
    return `${propiedad.calle} ${propiedad.altura}`
  }
  return propiedad.direccion ?? 'Propiedad'
}

function valorOpcional(valor) {
  const v = (valor ?? '').trim()
  return v || '—'
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

export default function PropiedadDetalleModal({ open, propiedad, onClose, onEdit, apilado = false }) {
  const [dependencias, setDependencias] = useState(null)
  const [cargandoDeps, setCargandoDeps] = useState(false)

  useEffect(() => {
    if (!open || !propiedad?.id) {
      setDependencias(null)
      setCargandoDeps(false)
      return
    }

    let activo = true
    setCargandoDeps(true)
    setDependencias(null)

    contarDependenciasPropiedad(propiedad.id).then((resultado) => {
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
  }, [open, propiedad?.id])

  if (!open || !propiedad) return null

  const estiloTipo = BADGE_PROPIEDAD_TIPO[propiedad.tipo] ?? { ...BADGE_PROPIEDAD_TIPO_DEFAULT, label: propiedad.tipo }
  const estiloEstado = BADGE_PROPIEDAD_ESTADO[propiedad.estado] ?? {
    ...BADGE_PROPIEDAD_ESTADO_DEFAULT,
    label: propiedad.estado,
  }
  const IconoTipo = ICONOS_TIPO[propiedad.tipo] ?? IconApartment

  const textoContratos = cargandoDeps ? 'Consultando…' : etiquetaContratos(dependencias)
  const textoReclamos = cargandoDeps
    ? 'Consultando…'
    : dependencias === null
      ? 'No disponible'
      : etiquetaReclamos(dependencias.reclamos ?? 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      layer={apilado ? 'stacked' : 'base'}
      labelledBy="propiedad-detalle-titulo"
    >
      <ModalHeader
        titleId="propiedad-detalle-titulo"
        title={tituloPrincipal(propiedad)}
        onClose={onClose}
        media={
          <span className={`${estiloTipo.iconClass} !h-11 !w-11`}>
            <IconoTipo className="h-5 w-5" />
          </span>
        }
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={estiloTipo.className}>{estiloTipo.label}</span>
          <span className={estiloEstado.className}>{estiloEstado.label}</span>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetalleFila label="Calle" value={propiedad.calle ?? '—'} icon={IconPin} />
          <DetalleFila label="Altura" value={propiedad.altura ?? '—'} icon={IconPin} />
          <DetalleFila label="Piso" value={valorOpcional(propiedad.piso)} icon={IconLayers} />
          <DetalleFila label="Unidad" value={valorOpcional(propiedad.unidad)} icon={IconDoor} />
          <DetalleFila label="Ciudad" value={propiedad.ciudad ?? '—'} icon={IconBuilding} />
          <DetalleFila label="Propietario" value={etiquetaPropietario(propiedad)} icon={IconUser} />
          <DetalleFila label="Contratos" value={textoContratos} icon={IconClipboard} className="sm:col-span-2" />
          <DetalleFila label="Reclamos" value={textoReclamos} icon={IconWrench} className="sm:col-span-2" />
        </div>

        <div className="mt-6">
          <FichaContratosReclamos propiedadId={propiedad.id} />
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
              onEdit(propiedad)
            }}
          >
            Editar
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
