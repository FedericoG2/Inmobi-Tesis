/**
 * Tokens de UI compartidos por el panel admin y el portal del inquilino.
 * Cualquier superficie, control o badge nuevo debería salir de acá para
 * mantener el mismo lenguaje visual en todo el sistema.
 */

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

/* ── Superficies ─────────────────────────────────────────── */

export const surfaceCard = 'rounded-xl border border-slate-200/80 bg-white shadow-card'

export const surfaceMuted = 'rounded-xl border border-slate-200/70 bg-slate-50/70'

export const surfacePopover = 'rounded-xl border border-slate-200 bg-white shadow-pop'

/* ── Tipografía ──────────────────────────────────────────── */

export const pageTitle = 'text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl'

export const pageSubtitle = 'mt-1 text-sm text-slate-500'

export const sectionTitle = 'text-sm font-semibold text-slate-900'

export const sectionHint = 'mt-0.5 text-xs text-slate-500'

export const eyebrow = 'text-[11px] font-medium uppercase tracking-wider text-slate-500'

export const numeric = 'tabular-nums'

/* ── Formularios ─────────────────────────────────────────── */

const controlBase =
  'w-full rounded-lg border bg-white text-sm text-slate-900 shadow-card outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

const controlOk = 'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/10'

const controlError = 'border-red-400 focus:border-red-500 focus:ring-red-500/10'

export const inputClass = cn(controlBase, controlOk, 'h-10 px-3')

export const inputErrorClass = cn(controlBase, controlError, 'h-10 px-3')

export const textareaClass = cn(controlBase, controlOk, 'min-h-24 px-3 py-2.5 leading-relaxed')

export const textareaErrorClass = cn(controlBase, controlError, 'min-h-24 px-3 py-2.5 leading-relaxed')

export const selectClass = cn(controlBase, controlOk, 'h-10 cursor-pointer appearance-none pl-3 pr-9')

export const selectErrorClass = cn(controlBase, controlError, 'h-10 cursor-pointer appearance-none pl-3 pr-9')

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700'

/** Título de sección dentro de un formulario. */
export const formSectionTitle = 'text-sm font-semibold text-slate-900'

/** Separador entre secciones de un formulario. */
export const formSectionClass = 'space-y-4 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0'

export const fieldErrorClass = 'mt-1.5 text-xs text-red-600'

export const fieldHintClass = 'mt-1.5 text-xs text-slate-500'

/** Control segmentado (p. ej. Persona física / jurídica). */
export const segmentedClass = 'flex rounded-lg bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70'

export const segmentedInlineClass = 'inline-flex rounded-lg bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70'

export function segmentedItemClass(activo, { fill = true } = {}) {
  return cn(
    fill ? 'flex-1' : 'flex-none',
    'rounded-md px-3 py-1.5 text-center text-sm font-medium transition',
    activo ? 'bg-white text-slate-900 shadow-card ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-900'
  )
}

/** Tarjeta seleccionable (opciones con ícono dentro de formularios). */
export function optionCardClass(activo) {
  return cn(
    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
    activo
      ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  )
}

/* ── Botones ─────────────────────────────────────────────── */

const buttonBase =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50'

export const buttonVariants = {
  primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 focus-visible:outline-brand-500',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-card hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white shadow-card hover:bg-red-700 focus-visible:outline-red-500',
  dangerOutline: 'border border-red-200 bg-white text-red-600 shadow-card hover:border-red-300 hover:bg-red-50',
  warning: 'bg-amber-600 text-white shadow-card hover:bg-amber-700 focus-visible:outline-amber-500',
}

export const buttonSizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9',
  iconSm: 'h-8 w-8',
}

export function buttonClass({ variant = 'primary', size = 'md', block = false, className = '' } = {}) {
  return cn(buttonBase, buttonVariants[variant] ?? buttonVariants.primary, buttonSizes[size] ?? buttonSizes.md, block && 'w-full', className)
}

/* ── Badges ──────────────────────────────────────────────── */

export const badgeBase =
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export const badgeTones = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  muted: 'bg-white text-slate-500 ring-slate-300/70',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
}

export function badgeClass(tone = 'neutral', className = '') {
  return cn(badgeBase, badgeTones[tone] ?? badgeTones.neutral, className)
}

/** Punto de color que acompaña a los badges de estado. */
export const dotTones = {
  brand: 'bg-brand-500',
  neutral: 'bg-slate-400',
  muted: 'bg-slate-300',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/* ── Íconos en recuadro ──────────────────────────────────── */

export const iconTileTones = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-600/10',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-600 ring-amber-600/15',
  danger: 'bg-red-50 text-red-600 ring-red-600/15',
}

export function iconTileClass(tone = 'brand', size = 'md', shape = 'square') {
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-lg'
  return cn('inline-flex shrink-0 items-center justify-center ring-1 ring-inset', radius, dims, iconTileTones[tone] ?? iconTileTones.brand)
}

/* ── Avisos ──────────────────────────────────────────────── */

export const calloutTones = {
  info: 'border-brand-200/70 bg-brand-50/60 text-brand-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

export function calloutClass(tone = 'info', className = '') {
  return cn('rounded-lg border px-3.5 py-3 text-sm leading-relaxed', calloutTones[tone] ?? calloutTones.info, className)
}

/* ── Estados de carga / vacío ────────────────────────────── */

export const loadingStateClass = 'flex min-h-[30vh] items-center justify-center gap-2 text-sm text-slate-500'

export const emptyStateClass = 'px-6 py-12 text-center text-sm text-slate-500'

/** Un <form> que envuelve ModalBody + ModalFooter. */
export const modalFormClass = 'flex min-h-0 flex-1 flex-col'

/** Pie de modal para formularios (mismo estilo que ModalFooter). */
export const modalFooterClass =
  'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5'
