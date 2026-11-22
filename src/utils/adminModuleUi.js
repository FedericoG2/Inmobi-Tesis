import { badgeClass, iconTileClass, inputClass, selectClass } from './ui'

/**
 * Los `className` de los BADGE_* son clases completas (forma + color):
 * se aplican directamente en un <span className={badge.className}>.
 */

export const inputToolbarClass = inputClass

export const selectToolbarClass = `${selectClass} shrink-0 sm:w-44`

export const celdaTexto = 'text-sm text-slate-600'
export const celdaNombre = 'text-sm font-medium text-slate-900'
export const celdaNumero = 'text-sm tabular-nums text-slate-600 whitespace-nowrap'

export const BADGE_PROPIETARIO_TIPO = {
  Física: {
    label: 'Persona física',
    tone: 'brand',
    className: badgeClass('brand'),
    avatarClass: 'rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/10',
  },
  Jurídica: {
    label: 'Persona jurídica',
    tone: 'neutral',
    className: badgeClass('neutral'),
    avatarClass: 'rounded-lg bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  },
}

export const BADGE_PERSONA_TIPO = BADGE_PROPIETARIO_TIPO

export const BADGE_INQUILINO_PORTAL = {
  activo: { label: 'Portal activo', tone: 'success', className: badgeClass('success') },
  inactivo: { label: 'Sin acceso', tone: 'muted', className: badgeClass('muted') },
}

export const BADGE_PROPIEDAD_TIPO = {
  Departamento: {
    label: 'Departamento',
    tone: 'neutral',
    className: badgeClass('neutral'),
    iconClass: iconTileClass('brand'),
  },
  Casa: {
    label: 'Casa',
    tone: 'neutral',
    className: badgeClass('neutral'),
    iconClass: iconTileClass('brand'),
  },
  'Local comercial': {
    label: 'Local comercial',
    tone: 'neutral',
    className: badgeClass('neutral'),
    iconClass: iconTileClass('brand'),
  },
}

export const BADGE_PROPIEDAD_TIPO_DEFAULT = {
  tone: 'neutral',
  className: badgeClass('neutral'),
  iconClass: iconTileClass('neutral'),
}

export const BADGE_PROPIEDAD_ESTADO = {
  Disponible: { label: 'Disponible', tone: 'success', className: badgeClass('success') },
  Reservada: { label: 'Reservada', tone: 'warning', className: badgeClass('warning') },
  Alquilada: { label: 'Alquilada', tone: 'brand', className: badgeClass('brand') },
  Mantenimiento: { label: 'Mantenimiento', tone: 'neutral', className: badgeClass('neutral') },
}

export const BADGE_PROPIEDAD_ESTADO_DEFAULT = { tone: 'neutral', className: badgeClass('neutral') }
