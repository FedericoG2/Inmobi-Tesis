import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'

export { esErrorContratosActivos as esErrorContratosAsociados }

export async function listarPropiedades() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .select(`
      id,
      propietario_id,
      direccion,
      tipo,
      estado,
      propietarios ( nombre_completo )
    `)
    .order('direccion')

  return { data, error }
}

export async function crearPropiedad(propiedad) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .insert({
      propietario_id: propiedad.propietario_id,
      direccion: propiedad.direccion,
      tipo: propiedad.tipo,
      estado: propiedad.estado,
    })
    .select(`
      id,
      propietario_id,
      direccion,
      tipo,
      estado,
      propietarios ( nombre_completo )
    `)
    .single()

  return { data, error }
}

export async function actualizarPropiedad(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .update({
      propietario_id: datos.propietario_id ? Number(datos.propietario_id) : null,
      direccion: datos.direccion,
      tipo: datos.tipo,
      estado: datos.estado,
    })
    .eq('id', id)
    .select(`
      id,
      propietario_id,
      direccion,
      tipo,
      estado,
      propietarios ( nombre_completo )
    `)
    .single()

  return { data, error }
}

/** Deriva Disponible / Alquilada según contratos activos de la propiedad. */
export async function sincronizarEstadoPropiedadPorContratos(propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { count, error: countError } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('propiedad_id', propiedadId)
    .eq('activo', true)

  if (countError) return { error: countError }

  const estado = (count ?? 0) > 0 ? 'Alquilada' : 'Disponible'

  const { error } = await supabase.from('propiedades').update({ estado }).eq('id', propiedadId)

  return { error }
}

export async function contarDependenciasPropiedad(propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const [contratosRes, reclamosRes] = await Promise.all([
    supabase
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)
      .eq('activo', true),
    supabase
      .from('reclamos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId),
  ])

  if (contratosRes.error) return { error: contratosRes.error }
  if (reclamosRes.error) return { error: reclamosRes.error }

  return {
    contratos: contratosRes.count ?? 0,
    reclamos: reclamosRes.count ?? 0,
  }
}

export async function eliminarPropiedad(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('propiedades').delete().eq('id', id)

  return { error }
}
