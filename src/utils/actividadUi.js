import {
  IconBuilding,
  IconCheckCircle,
  IconClipboard,
  IconDocument,
  IconTrendingUp,
  IconUndo,
  IconUser,
  IconUserGroup,
  IconWrench,
  IconXCircle,
} from '../components/icons/Icons'

/** Ícono y tono de cada tipo de evento del registro de actividad. */
const TIPOS = {
  contrato_creado: { icon: IconClipboard, tone: 'brand' },
  contrato_programado: { icon: IconClipboard, tone: 'warning' },
  contrato_activado: { icon: IconCheckCircle, tone: 'success' },
  contrato_finalizado: { icon: IconClipboard, tone: 'neutral' },
  reserva_cancelada: { icon: IconXCircle, tone: 'neutral' },
  contrato_anulado: { icon: IconXCircle, tone: 'danger' },
  aumento_aplicado: { icon: IconTrendingUp, tone: 'success' },
  aumento_acordado: { icon: IconTrendingUp, tone: 'brand' },
  aumento_deshecho: { icon: IconUndo, tone: 'neutral' },
  reclamo_creado: { icon: IconWrench, tone: 'warning' },
  reclamo_estado: { icon: IconWrench, tone: 'brand' },
  reclamo_nota: { icon: IconWrench, tone: 'neutral' },
  reclamo_eliminado: { icon: IconWrench, tone: 'neutral' },
  propiedad_creada: { icon: IconBuilding, tone: 'brand' },
  propiedad_estado: { icon: IconBuilding, tone: 'neutral' },
  propiedad_eliminada: { icon: IconBuilding, tone: 'neutral' },
  propietario_creado: { icon: IconUserGroup, tone: 'brand' },
  propietario_eliminado: { icon: IconUserGroup, tone: 'neutral' },
  inquilino_creado: { icon: IconUser, tone: 'brand' },
  inquilino_eliminado: { icon: IconUser, tone: 'neutral' },
  documento_subido: { icon: IconDocument, tone: 'brand' },
}

export function infoTipoActividad(evento) {
  const base = TIPOS[evento?.tipo] ?? { icon: IconClipboard, tone: 'neutral' }
  if (evento?.tipo === 'reclamo_estado' && /resuelto/i.test(evento.titulo ?? '')) {
    return { icon: IconCheckCircle, tone: 'success' }
  }
  return base
}

/** Ruta del admin donde se ve la entidad del evento. */
export function rutaAdminActividad(evento) {
  switch (evento?.entidad) {
    case 'contrato':
    case 'documento':
      return '/admin/contratos'
    case 'aumento':
      return '/admin/aumentos'
    case 'reclamo':
      return '/admin/reclamos'
    case 'propiedad':
      return '/admin/propiedades'
    case 'propietario':
      return '/admin/propietarios'
    case 'inquilino':
      return '/admin/inquilinos'
    default:
      return null
  }
}

/** Ruta del portal del inquilino para el evento. */
export function rutaPortalActividad(evento) {
  switch (evento?.entidad) {
    case 'reclamo':
      return '/inquilino/reclamos'
    case 'contrato':
    case 'aumento':
    case 'documento':
      return '/inquilino/contrato'
    default:
      return null
  }
}

const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })

/** "hace 5 minutos", "ayer", "hace 3 días"; más de una semana → fecha corta. */
export function tiempoRelativo(fecha, ahora = Date.now()) {
  if (!fecha) return ''
  const t = new Date(fecha).getTime()
  if (Number.isNaN(t)) return ''
  const seg = Math.round((t - ahora) / 1000)
  const abs = Math.abs(seg)
  if (abs < 45) return 'recién'
  if (abs < 3600) return rtf.format(Math.round(seg / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seg / 86400), 'day')
  const d = new Date(t)
  return `${d.getDate()} ${new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d).replace('.', '')}`
}

export function fechaHoraCompleta(fecha) {
  if (!fecha) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha))
}
