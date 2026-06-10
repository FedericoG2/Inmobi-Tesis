import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'

export { esErrorContratosActivos as esErrorContratosAsociados }

// String reutilizable con todas las columnas para mantener el código limpio y mantenible
const COLUMNAS_INQUILINO = 'id, perfil_id, tipo_persona, nombre_completo, dni_cuit, telefono, email, fecha_nacimiento, estado_civil, ocupacion, tipo_garantia, emergencia_nombre, emergencia_telefono, observaciones'

export async function listarInquilinos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  // Agregamos todas las nuevas columnas al select para que se vean en la grilla
  const { data, error } = await supabase
    .from('inquilinos')
    .select(COLUMNAS_INQUILINO)
    .order('nombre_completo')

  return { data, error }
}

export async function crearInquilino(inquilino) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  // Pasamos el objeto 'inquilino' completo tal cual viene del hook (ya procesado con sus nulls correspondientes)
  const { data, error } = await supabase
    .from('inquilinos')
    .insert(inquilino)
    .select(COLUMNAS_INQUILINO)
    .single()

  return { data, error }
}

export async function actualizarInquilino(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  // Pasamos el objeto 'datos' completo para actualizar todas las columnas modificadas en el modal
  const { data, error } = await supabase
    .from('inquilinos')
    .update(datos)
    .eq('id', id)
    .select(COLUMNAS_INQUILINO)
    .single()

  return { data, error }
}

export async function contarContratosPorInquilino(inquilinoId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { count, error } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('inquilino_id', inquilinoId)
    .eq('activo', true)

  if (error) return { error }

  return { contratos: count ?? 0 }
}

export async function eliminarInquilino(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('inquilinos').delete().eq('id', id)

  return { error }
}