import { supabase } from '../supabaseClient'
import {
  esTransicionEstadoValida,
  sinErrores,
  validarCamposReclamo,
} from '../utils/validarReclamo'

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

  // Validación de respaldo: no permitir retroceder de estado.
  if (datos.estado) {
    const { data: actual, error: errorActual } = await supabase
      .from('reclamos')
      .select('estado')
      .eq('id', id)
      .single()

    if (errorActual) {
      return { data: null, error: errorActual }
    }
    if (actual && !esTransicionEstadoValida(actual.estado, datos.estado)) {
      return {
        data: null,
        error: { message: 'No se puede volver a un estado anterior del reclamo.' },
      }
    }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      estado: datos.estado,
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
