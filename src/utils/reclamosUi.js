import {
  IconBolt,
  IconBricks,
  IconCheckCircle,
  IconClock,
  IconDrop,
  IconEye,
  IconFire,
  IconHome,
  IconKey,
  IconNoSymbol,
  IconPaintBrush,
  IconTag,
  IconWrench,
} from '../components/icons/Icons'
import { badgeBase, badgeTones } from './ui'

/**
 * Categorías y estados: chip neutro con ícono (el ícono identifica, el color no compite).
 * Prioridad y estado usan los tonos semánticos del sistema.
 */

export const RECLAMO_CHIP_CLASS =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700'

export const CATEGORIAS_RECLAMO = [
  { id: 'Plomeria', label: 'Plomería', icon: IconDrop },
  { id: 'Electricidad', label: 'Electricidad', icon: IconBolt },
  { id: 'Albañilería', label: 'Albañilería', icon: IconBricks },
  { id: 'Cerrajeria', label: 'Cerrajería', icon: IconKey },
  { id: 'Pintura', label: 'Pintura', icon: IconPaintBrush },
  { id: 'Estructural', label: 'Estructural', icon: IconHome },
  { id: 'Gas', label: 'Gas', icon: IconFire },
]

export const PRIORIDADES_RECLAMO = ['Baja', 'Media', 'Alta', 'Urgente']

/** Estilo del segmento activo del selector de prioridad (mismos tonos que BADGE_PRIORIDAD). */
export const PRIORIDAD_SEGMENTO_ACTIVO = {
  Baja: 'bg-white text-slate-900 shadow-card ring-1 ring-slate-200/80',
  Media: 'bg-brand-600 text-white shadow-card',
  Alta: 'bg-amber-500 text-white shadow-card',
  Urgente: 'bg-red-600 text-white shadow-card',
}

export const BADGE_PRIORIDAD = {
  Urgente: { label: 'Urgente', tone: 'danger', className: badgeTones.danger },
  Alta: { label: 'Alta', tone: 'warning', className: badgeTones.warning },
  Media: { label: 'Media', tone: 'brand', className: badgeTones.brand },
  Baja: { label: 'Baja', tone: 'neutral', className: badgeTones.neutral },
}

export const ESTADOS_RECLAMO = [
  { id: 'Pendiente', label: 'Pendiente', icon: IconClock, tone: 'warning' },
  { id: 'En Proceso', label: 'En Proceso', icon: IconWrench, tone: 'brand' },
  { id: 'Revision', label: 'Revisión', icon: IconEye, tone: 'brand' },
  { id: 'Resuelto', label: 'Resuelto', icon: IconCheckCircle, tone: 'success' },
  { id: 'Rechazado', label: 'Rechazado', icon: IconNoSymbol, tone: 'muted' },
]

const CATEGORIA_INFO = Object.fromEntries(CATEGORIAS_RECLAMO.map((c) => [c.id, c]))
const ESTADO_INFO = Object.fromEntries(ESTADOS_RECLAMO.map((e) => [e.id, e]))

/** Devuelve { id, label, icon } de la categoría (mismo set que el formulario). */
export function infoCategoria(categoria) {
  if (!categoria) return null
  return CATEGORIA_INFO[categoria] ?? { id: categoria, label: categoria, icon: IconTag }
}

/** Devuelve { id, label, icon, tone } del estado. */
export function infoEstado(estado) {
  if (!estado) return null
  return ESTADO_INFO[estado] ?? { id: estado, label: estado, icon: IconTag, tone: 'neutral' }
}

export function badgePrioridad(prioridad) {
  if (!prioridad) return null
  return BADGE_PRIORIDAD[prioridad] ?? {
    label: prioridad,
    tone: 'neutral',
    className: badgeTones.neutral,
  }
}

/** Forma base de los pills; se combina con `badge.className` (color). */
export const PILL_RING_CLASS = badgeBase
