/** Pills sólidos (mismo patrón que tipo/estado en Propiedades). */

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
  Urgente: { label: 'Urgente', className: 'bg-red-600 text-white' },
  Alta: { label: 'Alta', className: 'bg-amber-500 text-white' },
  Media: { label: 'Media', className: 'bg-indigo-600 text-white' },
  Baja: { label: 'Baja', className: 'bg-slate-500 text-white' },
}

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

export function badgePrioridad(prioridad) {
  if (!prioridad) return null
  return BADGE_PRIORIDAD[prioridad] ?? {
    label: prioridad,
    className: 'bg-slate-500 text-white',
  }
}

export function badgeEstado(estado) {
  if (!estado) return null
  return BADGE_ESTADO[estado] ?? {
    label: estado,
    className: 'bg-slate-500 text-white',
  }
}

export const PILL_SOLID_CLASS =
  'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold'
