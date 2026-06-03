import { supabase } from '../supabaseClient'

export async function listarContratos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      activo,
      propiedad_id,
      inquilino_id,
      propiedades ( direccion ),
      inquilinos ( nombre_completo )
    `)
    .order('fecha_inicio', { ascending: false })

  return { data, error }
}

export async function crearContrato(contrato) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .insert({
      inquilino_id: contrato.inquilino_id,
      propiedad_id: contrato.propiedad_id,
      fecha_inicio: contrato.fecha_inicio,
      fecha_fin: contrato.fecha_fin,
      monto_alquiler: contrato.monto_alquiler,
    })
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      activo,
      propiedad_id,
      inquilino_id,
      propiedades ( direccion ),
      inquilinos ( nombre_completo )
    `)
    .single()

  return { data, error }
}

export async function finalizarContrato(id) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .update({ activo: false })
    .eq('id', id)
    .eq('activo', true)
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      activo,
      propiedad_id,
      inquilino_id,
      propiedades ( direccion ),
      inquilinos ( nombre_completo )
    `)
    .maybeSingle()

  if (error) return { data: null, error }

  if (!data) {
    return { data: null, error: { message: 'El contrato ya está finalizado o no existe' } }
  }

  return { data, error: null }
}
