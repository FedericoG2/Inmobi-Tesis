import { supabase } from '../supabaseClient'

// Mismo mínimo que la pantalla Cuentas.
export const MIN_PASSWORD = 8

export const RUTA_RESTABLECER = '/restablecer-contrasena'

/** Valida la contraseña nueva y su repetición. Devuelve el mensaje de error o null. */
export function validarNuevaPassword(password, repetida) {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  if (password !== repetida) return 'Las contraseñas no coinciden.'
  return null
}

/** Traduce los errores de Supabase Auth de este flujo. */
export function mensajeErrorRecuperacion(error) {
  const codigo = String(error?.code ?? '')
  const texto = String(error?.message ?? '').toLowerCase()
  if (error?.status === 429 || codigo.includes('rate_limit') || texto.includes('rate limit')) {
    return 'Se enviaron demasiados emails en poco tiempo. Esperá unos minutos y volvé a intentar.'
  }
  if (codigo === 'same_password' || texto.includes('different from the old')) {
    return 'La contraseña nueva tiene que ser distinta de la anterior.'
  }
  if (codigo === 'weak_password' || texto.includes('weak')) {
    return 'La contraseña es demasiado débil. Usá una más larga, con letras y números.'
  }
  if (codigo === 'session_not_found' || texto.includes('session')) {
    return 'El enlace venció. Pedí uno nuevo desde la pantalla de inicio de sesión.'
  }
  return 'No se pudo completar la operación. Intentá de nuevo.'
}

/**
 * Envía el email con el enlace para crear una contraseña nueva.
 * Supabase no informa si el email tiene cuenta, así que la pantalla siempre muestra el mismo mensaje.
 */
export async function pedirEnlaceRecuperacion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${RUTA_RESTABLECER}`,
  })
  return { error }
}

/** Guarda la contraseña nueva del usuario que entró con el enlace y cierra esa sesión. */
export async function guardarNuevaPassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error }
  await supabase.auth.signOut()
  return { error: null }
}
