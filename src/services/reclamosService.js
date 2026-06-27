import { supabase } from '../supabaseClient'
import { sinErrores, validarCamposReclamo } from '../utils/validarReclamo'

function primerError(errores) {
  const claves = Object.keys(errores)
  return claves.length ? errores[claves[0]] : null
}

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
      categoria,
      fecha_creacion,
      propiedad_id,
      inquilino_id,
      contrato_id,
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

  const erroresCampos = validarCamposReclamo(reclamo)
  if (!sinErrores(erroresCampos)) {
    return { data: null, error: { message: primerError(erroresCampos) } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .insert({
      inquilino_id: reclamo.inquilino_id,
      propiedad_id: reclamo.propiedad_id,
      contrato_id: reclamo.contrato_id ?? null,
      titulo: reclamo.titulo.trim(),
      descripcion: reclamo.descripcion.trim(),
      estado: reclamo.estado,
      prioridad: reclamo.prioridad ?? 'Media',
      categoria: reclamo.categoria,
      
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

  const erroresCampos = validarCamposReclamo(datos)
  if (!sinErrores(erroresCampos)) {
    return { data: null, error: { message: primerError(erroresCampos) } }
  }

  // El estado NO se edita acá: se gestiona con gestionarReclamo() para dejar trazabilidad.
  const { data, error } = await supabase
    .from('reclamos')
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      prioridad: datos.prioridad,
      categoria: datos.categoria,
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

export async function listarEventosReclamo(reclamoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('reclamo_eventos')
    .select('id, reclamo_id, estado_anterior, estado_nuevo, comentario, creado_por, fecha_creacion')
    .eq('reclamo_id', reclamoId)
    .order('fecha_creacion', { ascending: false })
    .order('id', { ascending: false })

  return { data, error }
}

/**
 * Gestiona un reclamo: cambia el estado y/o agrega una nota, registrando el
 * evento en la trazabilidad. Pasá `estado` = null para dejar solo un comentario.
 */
export async function gestionarReclamo({ reclamoId, estado = null, comentario = null }) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase.rpc('gestionar_reclamo', {
    p_reclamo_id: reclamoId,
    p_estado_nuevo: estado,
    p_comentario: comentario,
  })

  return { data, error }
}
