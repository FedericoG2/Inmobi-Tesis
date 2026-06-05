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
      monto_inicial,
      periodicidad_meses,
      tipo_ajuste,
      porcentaje_ajuste,
      fecha_proximo_aumento,
      fecha_ultimo_aumento,
      dia_vencimiento,
      observaciones,
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

  const payload = {
    inquilino_id: contrato.inquilino_id,
    propiedad_id: contrato.propiedad_id,
    fecha_inicio: contrato.fecha_inicio,
    fecha_fin: contrato.fecha_fin,
    monto_alquiler: contrato.monto_alquiler,
    monto_inicial: contrato.monto_inicial ?? contrato.monto_alquiler,
    periodicidad_meses: contrato.periodicidad_meses ?? 12,
    tipo_ajuste: contrato.tipo_ajuste ?? 'manual',
    fecha_proximo_aumento: contrato.fecha_proximo_aumento ?? null,
    fecha_ultimo_aumento: null,
  }

  if (contrato.tipo_ajuste === 'porcentaje_fijo') {
    payload.porcentaje_ajuste = contrato.porcentaje_ajuste
  }

  if (contrato.dia_vencimiento) {
    payload.dia_vencimiento = Number(contrato.dia_vencimiento)
  }

  if (contrato.observaciones?.trim()) {
    payload.observaciones = contrato.observaciones.trim()
  }

  const { data, error } = await supabase.from('contratos').insert(payload)
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
