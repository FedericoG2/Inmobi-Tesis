import { supabase } from '../supabaseClient'
import {
  esErrorPropiedadContratoActivo,
  esErrorPropiedadNoDisponibleContrato,
  esErrorSolapamientoContrato,
} from '../utils/esErrorPropiedadNoDisponibleContrato'
import {
  MENSAJE_PROPIEDAD_CONTRATO_ACTIVO,
  MENSAJE_PROPIEDAD_NO_DISPONIBLE,
  MENSAJE_SOLAPAMIENTO_CONTRATO,
} from '../utils/propiedadElegibleContrato'
import { sincronizarEstadoPropiedadPorContratos } from './propiedadesService'
import { BUCKET_CONTRATOS } from './documentosService'

async function activarContratosProgramados() {
  if (!supabase) return
  await supabase.rpc('activar_contratos_programados')
}

export { activarContratosProgramados }

export async function listarContratos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  await activarContratosProgramados()

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
      fecha_proximo_aumento,
      fecha_ultimo_aumento,
      dia_vencimiento,
      observaciones,
      estado,
      motivo_cierre,
      observaciones_cierre,
      cerrado_en,
      propiedad_id,
      inquilino_id,
      propiedades ( direccion ),
      inquilinos ( nombre_completo )
    `)
    .order('fecha_inicio', { ascending: false })

  return { data, error }
}

export async function obtenerContratoDetalle(id) {
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
      fecha_proximo_aumento,
      fecha_ultimo_aumento,
      dia_vencimiento,
      observaciones,
      estado,
      motivo_cierre,
      observaciones_cierre,
      cerrado_en,
      propiedad_id,
      inquilino_id,
      propiedades (
        id,
        direccion,
        ciudad,
        calle,
        altura,
        piso,
        unidad,
        tipo,
        estado
      ),
      inquilinos (
        id,
        nombre_completo,
        tipo_persona,
        dni_cuit,
        email,
        telefono
      ),
      aumentos (
        id,
        fecha_aplicacion,
        monto_anterior,
        monto_nuevo,
        porcentaje_aplicado,
        indice_tipo,
        indice_valor_inicio,
        indice_valor_fin,
        modo,
        fecha_creacion
      )
    `)
    .eq('id', id)
    .order('fecha_aplicacion', { foreignTable: 'aumentos', ascending: false })
    .maybeSingle()

  return { data, error }
}

/** Inquilino y propiedad de un contrato (para abrir sus fichas desde el detalle de un aumento). */
export async function obtenerPartesContrato(id) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('inquilino_id, propiedad_id')
    .eq('id', id)
    .maybeSingle()

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

  const payload = {
    inquilino_id: contrato.inquilino_id,
    propiedad_id: contrato.propiedad_id,
    fecha_inicio: contrato.fecha_inicio,
    fecha_fin: contrato.fecha_fin,
    monto_alquiler: contrato.monto_alquiler,
    monto_inicial: contrato.monto_inicial ?? contrato.monto_alquiler,
    periodicidad_meses: contrato.periodicidad_meses ?? 12,
    tipo_ajuste: contrato.tipo_ajuste ?? 'ipc',
    fecha_proximo_aumento: contrato.fecha_proximo_aumento ?? null,
    fecha_ultimo_aumento: null,
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
      estado,
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
    if (esErrorSolapamientoContrato(error)) {
      return { data: null, error: { message: MENSAJE_SOLAPAMIENTO_CONTRATO } }
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

  const contar = (tabla) => supabase.from(tabla).select('id', { count: 'exact', head: true })
  const [aumentosRes, periodosRes, comprobantesRes, reclamosRes] = await Promise.all([
    contar('aumentos').eq('contrato_id', contratoId),
    contar('periodos_alquiler').eq('contrato_id', contratoId),
    contar('comprobantes_pago').eq('contrato_id', contratoId),
    contar('reclamos').eq('inquilino_id', inquilinoId).eq('propiedad_id', propiedadId),
  ])

  const conError = [aumentosRes, periodosRes, comprobantesRes, reclamosRes].find((r) => r.error)
  if (conError) return { error: conError.error }

  return {
    aumentos: aumentosRes.count ?? 0,
    periodos: periodosRes.count ?? 0,
    comprobantes: comprobantesRes.count ?? 0,
    reclamos: reclamosRes.count ?? 0,
  }
}

export async function anularContrato(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  // Las rutas se leen antes: al borrar el contrato, la base borra sus filas de documentos.
  const { data: adjuntos, error: errorAdjuntos } = await supabase
    .from('documentos')
    .select('url_archivo')
    .eq('contrato_id', id)

  if (errorAdjuntos) return { error: errorAdjuntos }

  const { data, error } = await supabase
    .from('contratos')
    .delete()
    .eq('id', id)
    .in('estado', ['inactivo', 'programado'])
    .select('id, propiedad_id')
    .maybeSingle()

  if (error) return { error }

  if (!data) {
    return { error: { message: 'No se puede anular un contrato activo. Finalizalo primero.' } }
  }

  const syncError = await sincronizarEstadoPropiedadPorContratos(data.propiedad_id)

  // Los archivos se borran recién cuando el contrato ya se eliminó: si la base lo rechaza, quedan.
  const rutas = (adjuntos ?? []).map((d) => d.url_archivo).filter(Boolean)
  if (rutas.length) {
    const { error: errorStorage } = await supabase.storage.from(BUCKET_CONTRATOS).remove(rutas)
    if (errorStorage) {
      console.error('[Inmobi] No se pudieron borrar los adjuntos del contrato eliminado:', errorStorage.message)
    }
  }

  if (syncError.error) return { error: syncError.error }

  return { error: null }
}

/**
 * Cierra un contrato (CU-010 y CU-011): un activo se finaliza o se rescinde; un programado se
 * cancela. La base valida el motivo, guarda la fecha de cierre y libera la propiedad.
 */
export async function finalizarContrato(id, { motivo = null, observaciones = '' } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .update({ estado: 'inactivo', motivo_cierre: motivo, observaciones_cierre: observaciones?.trim() || null })
    .eq('id', id)
    .in('estado', ['activo', 'programado'])
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      estado,
      motivo_cierre,
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

/**
 * Historial de cambios de un contrato (tabla auditoria): el contrato, sus períodos, aumentos y
 * comprobantes, con quién hizo cada cambio y los valores de antes y de después.
 */
export async function listarAuditoriaContrato(contratoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }
  return supabase.rpc('auditoria_contrato', { p_contrato_id: contratoId })
}
