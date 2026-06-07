import { supabase } from '../supabaseClient'

export async function listarPropietarios() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .select('id, nombre_completo, dni_cuit, telefono, email')
    .order('nombre_completo')

  return { data, error }
}

export async function crearPropietario(propietario) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .insert({
      nombre_completo: propietario.nombre_completo,
      dni_cuit: propietario.dni_cuit,
      telefono: propietario.telefono,
      email: propietario.email,
    })
    .select('id, nombre_completo, dni_cuit, telefono, email')
    .single()

  return { data, error }
}

export async function actualizarPropietario(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .update({
      nombre_completo: datos.nombre_completo,
      dni_cuit: datos.dni_cuit,
      telefono: datos.telefono,
      email: datos.email,
    })
    .eq('id', id)
    .select('id, nombre_completo, dni_cuit, telefono, email')
    .single()

  return { data, error }
}

export async function contarPropiedadesPorPropietario(propietarioId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { count, error } = await supabase
    .from('propiedades')
    .select('id', { count: 'exact', head: true })
    .eq('propietario_id', propietarioId)

  if (error) return { error }

  return { propiedades: count ?? 0 }
}

export async function eliminarPropietario(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('propietarios').delete().eq('id', id)

  return { error }
}
