import { supabase } from '../supabaseClient'
import {
  esErrorPropiedadContratoActivo,
  esErrorPropiedadNoDisponibleContrato,
} from '../utils/esErrorPropiedadNoDisponibleContrato'
import {
  MENSAJE_PROPIEDAD_CONTRATO_ACTIVO,
  MENSAJE_PROPIEDAD_NO_DISPONIBLE,
} from '../utils/propiedadElegibleContrato'
import { sincronizarEstadoPropiedadPorContratos } from './propiedadesService'

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

  const { data: propiedad, error: propiedadError } = await supabase
    .from('propiedades')
    .select('id, estado')
    .eq('id', contrato.propiedad_id)
    .single()

  if (propiedadError) return { data: null, error: propiedadError }

  if (propiedad.estado !== 'Disponible') {
    return { data: null, error: { message: MENSAJE_PROPIEDAD_NO_DISPONIBLE } }
  }

  const { count: contratosActivos, error: contratosError } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('propiedad_id', contrato.propiedad_id)
    .eq('activo', true)

  if (contratosError) return { data: null, error: contratosError }

  if ((contratosActivos ?? 0) > 0) {
    return { data: null, error: { message: MENSAJE_PROPIEDAD_CONTRATO_ACTIVO } }
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

  if (error) {
    if (esErrorPropiedadNoDisponibleContrato(error)) {
      return { data: null, error: { message: MENSAJE_PROPIEDAD_NO_DISPONIBLE } }
    }
    if (esErrorPropiedadContratoActivo(error)) {
      return { data: null, error: { message: MENSAJE_PROPIEDAD_CONTRATO_ACTIVO } }
    }
    return { data, error }
  }

  const syncError = await sincronizarEstadoPropiedadPorContratos(data.propiedad_id)
  if (syncError.error) return { data, error: syncError.error }

  return { data, error: null }
}

export async function contarMovimientosContrato(contratoId, inquilinoId, propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const [aumentosRes, reclamosRes] = await Promise.all([
    supabase
      .from('aumentos')
      .select('id', { count: 'exact', head: true })
      .eq('contrato_id', contratoId),
    supabase
      .from('reclamos')
      .select('id', { count: 'exact', head: true })
      .eq('inquilino_id', inquilinoId)
      .eq('propiedad_id', propiedadId),
  ])

  if (aumentosRes.error) return { error: aumentosRes.error }
  if (reclamosRes.error) return { error: reclamosRes.error }

  return {
    aumentos: aumentosRes.count ?? 0,
    reclamos: reclamosRes.count ?? 0,
  }
}

export async function anularContrato(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .delete()
    .eq('id', id)
    .eq('activo', false)
    .select('id, propiedad_id')
    .maybeSingle()

  if (error) return { error }

  if (!data) {
    return { error: { message: 'No se puede anular un contrato activo. Finalizalo primero.' } }
  }

  const syncError = await sincronizarEstadoPropiedadPorContratos(data.propiedad_id)
  if (syncError.error) return { error: syncError.error }

  return { error: null }
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

  const syncError = await sincronizarEstadoPropiedadPorContratos(data.propiedad_id)
  if (syncError.error) return { data, error: syncError.error }

  return { data, error: null }
}
