/** Pills sólidos (prioridad). Chips con borde (categoría y estado). */

export const RECLAMO_CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700'

export const CATEGORIAS_RECLAMO = [
  { id: 'Plomeria', label: 'Plomería', icon: '🚰' },
  { id: 'Electricidad', label: 'Electricidad', icon: '⚡' },
  { id: 'Albañilería', label: 'Albañilería', icon: '🧱' },
  { id: 'Cerrajeria', label: 'Cerrajería', icon: '🔑' },
  { id: 'Pintura', label: 'Pintura', icon: '🖌️' },
  { id: 'Estructural', label: 'Estructural', icon: '🏠' },
  { id: 'Gas', label: 'Gas', icon: '🔥' },
]

export const PRIORIDADES_RECLAMO = ['Baja', 'Media', 'Alta', 'Urgente']

export const BADGE_CATEGORIA = {
  Plomeria: { label: 'Plomería', className: 'bg-sky-600 text-white' },
  Electricidad: { label: 'Electricidad', className: 'bg-amber-500 text-white' },
  'Albañilería': { label: 'Albañilería', className: 'bg-orange-600 text-white' },
  Cerrajeria: { label: 'Cerrajería', className: 'bg-slate-600 text-white' },
  Pintura: { label: 'Pintura', className: 'bg-pink-600 text-white' },
  Estructural: { label: 'Estructural', className: 'bg-stone-600 text-white' },
  Gas: { label: 'Gas', className: 'bg-red-600 text-white' },
}

export const BADGE_PRIORIDAD = {
  Urgente: { label: 'Urgente', className: 'bg-red-50 text-red-800 ring-red-200' },
  Alta: { label: 'Alta', className: 'bg-orange-50 text-orange-800 ring-orange-200' },
  Media: { label: 'Media', className: 'bg-brand-50 text-brand-800 ring-brand-200' },
  Baja: { label: 'Baja', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
}

export const ESTADOS_RECLAMO = [
  { id: 'Pendiente', label: 'Pendiente', icon: '⏳' },
  { id: 'En Proceso', label: 'En Proceso', icon: '🔧' },
  { id: 'Revision', label: 'Revisión', icon: '🔍' },
  { id: 'Resuelto', label: 'Resuelto', icon: '✅' },
  { id: 'Rechazado', label: 'Rechazado', icon: '🚫' },
]

/** @deprecated Usar infoEstado + ReclamoEstadoChip para la UI admin. */
export const BADGE_ESTADO = {
  Pendiente: { label: 'Pendiente', className: 'bg-amber-500 text-white' },
  'En Proceso': { label: 'En Proceso', className: 'bg-blue-600 text-white' },
  Revision: { label: 'Revisión', className: 'bg-violet-600 text-white' },
  Resuelto: { label: 'Resuelto', className: 'bg-emerald-600 text-white' },
}

export function badgeCategoria(categoria) {
  if (!categoria) return null
  return BADGE_CATEGORIA[categoria] ?? {
    label: categoria,
    className: 'bg-slate-500 text-white',
  }
}

const CATEGORIA_INFO = Object.fromEntries(CATEGORIAS_RECLAMO.map((c) => [c.id, c]))
const ESTADO_INFO = Object.fromEntries(ESTADOS_RECLAMO.map((e) => [e.id, e]))

/** Devuelve { id, label, icon } de la categoría (mismo set que el formulario). */
export function infoCategoria(categoria) {
  if (!categoria) return null
  return CATEGORIA_INFO[categoria] ?? { id: categoria, label: categoria, icon: '🛠️' }
}

/** Devuelve { id, label, icon } del estado (mismo patrón visual que categoría). */
export function infoEstado(estado) {
  if (!estado) return null
  return ESTADO_INFO[estado] ?? { id: estado, label: estado, icon: '📋' }
}

export function badgePrioridad(prioridad) {
  if (!prioridad) return null
  return BADGE_PRIORIDAD[prioridad] ?? {
    label: prioridad,
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  }
}

export function badgeEstado(estado) {
  if (!estado) return null
  return BADGE_ESTADO[estado] ?? {
    label: estado,
    className: 'bg-slate-500 text-white',
  }
}

export const PILL_RING_CLASS =
  'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'

/** @deprecated Usar PILL_RING_CLASS */
export const PILL_SOLID_CLASS = PILL_RING_CLASS
