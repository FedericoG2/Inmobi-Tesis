const BADGE_INDIGO =
  'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
const BADGE_SLATE =
  'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
const BADGE_SLATE_MUTED =
  'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200'
const BADGE_EMERALD =
  'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
const BADGE_ORANGE =
  'bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200'

export const inputToolbarClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

export const selectToolbarClass =
  'h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 shrink-0 sm:w-44'

export const celdaTexto = 'text-sm text-slate-700'
export const celdaNombre = 'text-sm font-medium text-slate-900'
export const celdaNumero = 'text-sm tabular-nums text-slate-700 whitespace-nowrap'

export const BADGE_PROPIETARIO_TIPO = {
  Física: {
    label: 'Particular',
    className: BADGE_INDIGO,
    avatarClass: 'rounded-full bg-brand-100 text-brand-700',
  },
  Jurídica: {
    label: 'Empresa',
    className: BADGE_SLATE,
    avatarClass: 'rounded-lg bg-slate-100 text-slate-700',
  },
}

export const BADGE_PERSONA_TIPO = BADGE_PROPIETARIO_TIPO

export const BADGE_INQUILINO_PORTAL = {
  activo: { label: 'Portal activo', className: BADGE_EMERALD },
  inactivo: { label: 'Sin acceso', className: BADGE_SLATE_MUTED },
}

export const BADGE_PROPIEDAD_TIPO = {
  Departamento: {
    label: 'Departamento',
    className: BADGE_INDIGO,
    iconClass: 'rounded-lg bg-brand-100 text-brand-700',
  },
  Casa: {
    label: 'Casa',
    className: BADGE_SLATE,
    iconClass: 'rounded-lg bg-slate-100 text-slate-700',
  },
  'Local comercial': {
    label: 'Local comercial',
    className: BADGE_SLATE_MUTED,
    iconClass: 'rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  },
}

export const BADGE_PROPIEDAD_ESTADO = {
  Disponible: { label: 'Disponible', className: BADGE_EMERALD },
  Reservada: { label: 'Reservada', className: BADGE_INDIGO },
  Alquilada: { label: 'Alquilada', className: BADGE_ORANGE },
  Mantenimiento: { label: 'Mantenimiento', className: BADGE_SLATE_MUTED },
}
