import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'
import { TIPOS_PROPIEDAD, ESTADOS_PROPIEDAD } from '../utils/validaciones'

export { esErrorContratosActivos as esErrorContratosAsociados }

const SELECT_PROPIEDAD = `
  id,
  propietario_id,
  direccion,
  tipo,
  estado,
  propietarios ( nombre_completo )
`

function sanitizarPropiedad(datos) {
  const tipo = datos.tipo
  const estado = datos.estado

  if (!TIPOS_PROPIEDAD.includes(tipo)) {
    return { error: { message: `Tipo de propiedad inválido: "${tipo}"` } }
  }
  if (!ESTADOS_PROPIEDAD.includes(estado)) {
    return { error: { message: `Estado de propiedad inválido: "${estado}"` } }
  }

  const direccion = (datos.direccion ?? '').trim()
  if (!direccion) {
    return { error: { message: 'La dirección es obligatoria' } }
  }

  return {
    datos: {
      propietario_id: datos.propietario_id ? Number(datos.propietario_id) : null,
      direccion,
      tipo,
      estado,
    },
  }
}

export async function listarPropiedades() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .select(SELECT_PROPIEDAD)
    .order('direccion')

  return { data, error }
}

export async function crearPropiedad(propiedad) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!propiedad.propietario_id) {
    return { data: null, error: { message: 'Debe asignar un propietario a la propiedad' } }
  }

  const sanitizado = sanitizarPropiedad(propiedad)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  const { data, error } = await supabase
    .from('propiedades')
    .insert(sanitizado.datos)
    .select(SELECT_PROPIEDAD)
    .single()

  return { data, error }
}

export async function actualizarPropiedad(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!datos.propietario_id) {
    return { data: null, error: { message: 'Debe asignar un propietario a la propiedad' } }
  }

  const sanitizado = sanitizarPropiedad(datos)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  const { data, error } = await supabase
    .from('propiedades')
    .update(sanitizado.datos)
    .eq('id', id)
    .select(SELECT_PROPIEDAD)
    .single()

  return { data, error }
}

/**
 * Devuelve la cantidad de contratos activos, contratos históricos y reclamos
 * asociados a una propiedad. Usado para bloquear o advertir antes de eliminar.
 */
export async function contarDependenciasPropiedad(propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const [contratosActivosRes, contratosHistoricosRes, reclamosRes] = await Promise.all([
    supabase
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)
      .eq('activo', true),
    supabase
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)
      .eq('activo', false),
    supabase
      .from('reclamos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId),
  ])

  if (contratosActivosRes.error) return { error: contratosActivosRes.error }
  if (contratosHistoricosRes.error) return { error: contratosHistoricosRes.error }
  if (reclamosRes.error) return { error: reclamosRes.error }

  return {
    contratos_activos: contratosActivosRes.count ?? 0,
    contratos_historicos: contratosHistoricosRes.count ?? 0,
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
