import { supabase } from '../supabaseClient'

export const ROL_LABEL = {
  admin: 'Administrador de sistema',
  encargado: 'Encargado de Alquileres',
  inquilino: 'Inquilino',
}

async function invocar(accion, datos = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase.functions.invoke('gestionar-cuentas', {
    body: { accion, ...datos },
  })

  if (error) {
    let message = 'No se pudo completar la operación'
    try {
      const cuerpo = await error.context?.json()
      if (cuerpo?.error) message = cuerpo.error
    } catch {
      // respuesta sin cuerpo JSON
    }
    return { data: null, error: { message } }
  }

  return { data, error: null }
}

export const listarCuentas = () => invocar('listar')

export const crearCuenta = ({ email, password, rol, inquilinoId }) =>
  invocar('crear', { email, password, rol, inquilino_id: inquilinoId ?? null })

export const cambiarRolCuenta = ({ userId, rol, inquilinoId }) =>
  invocar('cambiar_rol', { user_id: userId, rol, inquilino_id: inquilinoId ?? null })

export const bloquearCuenta = ({ userId, bloquear }) =>
  invocar('bloquear', { user_id: userId, bloquear })

export const restablecerPasswordCuenta = ({ userId, password }) =>
  invocar('restablecer_password', { user_id: userId, password })
