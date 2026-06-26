// Validaciones y reglas de estado compartidas entre el panel admin y el portal del inquilino.

export const RECLAMO_LIMITES = {
  TITULO_MIN: 3,
  TITULO_MAX: 100,
  DESCRIPCION_MIN: 5,
  DESCRIPCION_MAX: 500,
}

// Orden del ciclo de vida del reclamo. El índice define qué tan "avanzado" está.
export const FLUJO_ESTADOS = ['Pendiente', 'En Proceso', 'Revision', 'Resuelto']

export const ESTADO_LABEL = {
  Pendiente: 'Pendiente',
  'En Proceso': 'En Proceso',
  Revision: 'Revisión',
  Resuelto: 'Resuelto',
}

/**
 * Estados a los que se puede pasar desde `estadoActual`.
 * Solo permite el estado actual y los posteriores (no se puede retroceder).
 */
export function estadosPermitidos(estadoActual) {
  const idx = FLUJO_ESTADOS.indexOf(estadoActual)
  if (idx === -1) return FLUJO_ESTADOS
  return FLUJO_ESTADOS.slice(idx)
}

/** true si pasar de `estadoActual` a `estadoNuevo` es una transición válida (no retrocede). */
export function esTransicionEstadoValida(estadoActual, estadoNuevo) {
  const actual = FLUJO_ESTADOS.indexOf(estadoActual)
  const nuevo = FLUJO_ESTADOS.indexOf(estadoNuevo)
  if (actual === -1 || nuevo === -1) return false
  return nuevo >= actual
}

/**
 * Valida los campos de texto de un reclamo. Devuelve un objeto con errores por campo
 * (vacío si todo OK). Pensado para usar tanto en la UI como en los services.
 */
export function validarCamposReclamo({ titulo, descripcion } = {}) {
  const errores = {}

  const tituloLimpio = (titulo ?? '').trim()
  if (!tituloLimpio) {
    errores.titulo = 'El título es obligatorio.'
  } else if (tituloLimpio.length < RECLAMO_LIMITES.TITULO_MIN) {
    errores.titulo = `El título debe tener al menos ${RECLAMO_LIMITES.TITULO_MIN} caracteres.`
  } else if (tituloLimpio.length > RECLAMO_LIMITES.TITULO_MAX) {
    errores.titulo = `El título no puede superar los ${RECLAMO_LIMITES.TITULO_MAX} caracteres.`
  }

  const descripcionLimpia = (descripcion ?? '').trim()
  if (!descripcionLimpia) {
    errores.descripcion = 'La descripción es obligatoria.'
  } else if (descripcionLimpia.length < RECLAMO_LIMITES.DESCRIPCION_MIN) {
    errores.descripcion = `La descripción debe tener al menos ${RECLAMO_LIMITES.DESCRIPCION_MIN} caracteres.`
  } else if (descripcionLimpia.length > RECLAMO_LIMITES.DESCRIPCION_MAX) {
    errores.descripcion = `La descripción no puede superar los ${RECLAMO_LIMITES.DESCRIPCION_MAX} caracteres.`
  }

  return errores
}

/** Valida un reclamo completo del admin (incluye inquilino/propiedad/categoría). */
export function validarReclamoAdmin(form = {}) {
  const errores = validarCamposReclamo(form)

  if (!form.inquilino_id) {
    errores.inquilino_id = 'Seleccioná un inquilino.'
  }
  if (!form.propiedad_id) {
    errores.propiedad_id = 'Seleccioná la propiedad del reclamo.'
  }
  if (!form.categoria) {
    errores.categoria = 'Seleccioná una categoría.'
  }

  return errores
}

/** Helper rápido: true si el objeto de errores no tiene ninguna clave. */
export function sinErrores(errores) {
  return Object.keys(errores).length === 0
}
