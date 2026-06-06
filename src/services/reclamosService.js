import { supabase } from '../supabaseClient'

export async function listarReclamos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      prioridad,
      fecha_creacion,
      propiedad_id,
      inquilino_id,
      inquilinos ( nombre_completo ),
      propiedades ( direccion )
    `)
    .order('estado')
  return { data, error }
}

export async function crearReclamo(reclamo) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .insert({
      inquilino_id: reclamo.inquilino_id,
      propiedad_id: reclamo.propiedad_id,
      titulo: reclamo.titulo,
      descripcion: reclamo.descripcion,
      estado: reclamo.estado,
      prioridad: reclamo.prioridad ?? 'Media',
      
    })
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      prioridad,
      fecha_creacion,
      propiedad_id,
      inquilino_id,
      inquilinos ( nombre_completo ),
      propiedades ( direccion )
    `)
    .single()

return { data, error }
}
export async function actualizarReclamo(id, datos) {
 if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }
  const { data, error } = await supabase
    .from('reclamos')
    .update({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      estado: datos.estado,
      prioridad: datos.prioridad,
    })
    .eq('id', id)
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      prioridad,
      fecha_creacion,
      propiedad_id,
      inquilino_id,
      inquilinos ( nombre_completo ),
      propiedades ( direccion )
    `)
    .single()

  return { data, error }
}

export async function eliminarReclamo(id) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('reclamos').delete().eq('id', id)

  return { error }
} 
