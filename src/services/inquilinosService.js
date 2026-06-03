import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'

export { esErrorContratosActivos as esErrorContratosAsociados }

export async function listarInquilinos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .select('id, perfil_id, nombre_completo, dni_cuit, telefono')
    .order('nombre_completo')

  return { data, error }
}

export async function crearInquilino(inquilino) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .insert({
      nombre_completo: inquilino.nombre_completo,
      dni_cuit: inquilino.dni_cuit,
      telefono: inquilino.telefono,
    })
    .select('id, perfil_id, nombre_completo, dni_cuit, telefono')
    .single()

  return { data, error }
}

export async function actualizarInquilino(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .update({
      nombre_completo: datos.nombre_completo,
      dni_cuit: datos.dni_cuit,
      telefono: datos.telefono,
    })
    .eq('id', id)
    .select('id, perfil_id, nombre_completo, dni_cuit, telefono')
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
