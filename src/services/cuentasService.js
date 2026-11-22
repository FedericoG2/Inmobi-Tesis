import { supabase } from '../supabaseClient'

export const ROL_LABEL = {
  admin: 'Administrador de sistema',
  encargado: 'Encargado de Alquileres',
  inquilino: 'Inquilino',
  propietario: 'Propietario',
}

/** Roles que se vinculan con una ficha cargada por el Encargado: la cuenta abre su portal. */
export const ROLES_CON_FICHA = ['inquilino', 'propietario']

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

export const crearCuenta = ({ email, password, rol, fichaId }) =>
  invocar('crear', { email, password, rol, ficha_id: fichaId ?? null })

export const bloquearCuenta = ({ userId, bloquear }) =>
  invocar('bloquear', { user_id: userId, bloquear })

export const restablecerPasswordCuenta = ({ userId, password }) =>
  invocar('restablecer_password', { user_id: userId, password })

/** Modifica la cuenta (CU-062 y CU-063): email de acceso, rol y ficha vinculada. */
export const modificarCuenta = ({ userId, email, rol, fichaId }) =>
  invocar('modificar', { user_id: userId, email, rol, ficha_id: fichaId ?? null })
