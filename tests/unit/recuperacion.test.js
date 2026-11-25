// Recuperación de contraseña: validación de la contraseña nueva y mensajes de error de Supabase Auth.
import { describe, expect, test } from 'vitest'
import { MIN_PASSWORD, mensajeErrorRecuperacion, validarNuevaPassword } from '../../src/services/recuperacionService'

describe('Contraseña nueva', () => {
  test('exige el mínimo de caracteres y que las dos coincidan', () => {
    expect(validarNuevaPassword('corta', 'corta')).toMatch(String(MIN_PASSWORD))
    expect(validarNuevaPassword('unaClave123', 'otraClave123')).toBe('Las contraseñas no coinciden.')
    expect(validarNuevaPassword('unaClave123', 'unaClave123')).toBeNull()
  })
})

describe('Mensajes de error', () => {
  test('límite de envíos de email', () => {
    expect(mensajeErrorRecuperacion({ status: 429, code: 'over_email_send_rate_limit' })).toMatch(/demasiados emails/)
  })

  test('misma contraseña, contraseña débil y enlace vencido', () => {
    expect(mensajeErrorRecuperacion({ code: 'same_password' })).toMatch(/distinta de la anterior/)
    expect(mensajeErrorRecuperacion({ code: 'weak_password' })).toMatch(/débil/)
    expect(mensajeErrorRecuperacion({ code: 'session_not_found' })).toMatch(/venció/)
  })

  test('un error desconocido muestra un mensaje general', () => {
    expect(mensajeErrorRecuperacion({ message: 'algo raro' })).toBe('No se pudo completar la operación. Intentá de nuevo.')
  })
})
