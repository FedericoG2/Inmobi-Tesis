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
      porcentaje_ajuste,
      fecha_proximo_aumento,
      fecha_ultimo_aumento,
      dia_vencimiento,
      observaciones,
      activo,
      estado,
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
      porcentaje_ajuste,
      fecha_proximo_aumento,
      fecha_ultimo_aumento,
      dia_vencimiento,
      observaciones,
      activo,
      estado,
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
      activo,
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
    .in('estado', ['inactivo', 'programado'])
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
    .update({ activo: false, estado: 'inactivo' })
    .eq('id', id)
    .in('estado', ['activo', 'programado'])
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      activo,
      estado,
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
