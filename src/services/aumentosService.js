import { supabase } from '../supabaseClient'
import { activarContratosProgramados } from './contratosService'
import { eliminarComprobanteAumento, subirComprobanteAumento } from './documentosService'

/** Aplica los aumentos acordados cuya fecha ya llegó (fallback del cron diario). */
async function aplicarAumentosProgramados() {
  if (!supabase) return
  await supabase.rpc('aplicar_aumentos_programados')
}

/** Activa contratos programados y aplica aumentos vencidos (idempotente). */
export async function ejecutarMantenimientoContratos() {
  if (!supabase) return
  await Promise.all([activarContratosProgramados(), aplicarAumentosProgramados()])
}

function hoyIsoLocal() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function sumarDiasIso(fechaIso, dias) {
  const [y, m, day] = fechaIso.split('-').map(Number)
  const date = new Date(y, m - 1, day + dias)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function diffDiasIso(desdeIso, hastaIso) {
  const [y1, m1, d1] = desdeIso.split('-').map(Number)
  const [y2, m2, d2] = hastaIso.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.round(ms / 86400000)
}

function mapColaItem(row, hoy) {
  const fecha = row.fecha_proximo_aumento
  const esVencido = fecha <= hoy
  const dias = diffDiasIso(esVencido ? fecha : hoy, esVencido ? hoy : fecha)

  return {
    contrato_id: row.id,
    tipo_ajuste: row.tipo_ajuste,
    inquilino_nombre: row.inquilinos?.nombre_completo ?? null,
    propiedad_direccion: row.propiedades?.direccion ?? null,
    monto_actual: row.monto_alquiler,
    fecha_proximo_aumento: fecha,
    periodicidad_meses: row.periodicidad_meses,
    es_vencido: esVencido,
    dias,
  }
}

/** Cola operativa ICL/IPC: vencidos + próximos N días (sin calcular montos). */
export async function listarColaAumentos({ diasProximos = 30 } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  await ejecutarMantenimientoContratos()

  const hoy = hoyIsoLocal()
  const limite = sumarDiasIso(hoy, diasProximos)

  const { data, error } = await supabase
    .from('contratos')
    .select(`
      id,
      tipo_ajuste,
      monto_alquiler,
      fecha_proximo_aumento,
      fecha_fin,
      periodicidad_meses,
      inquilinos ( nombre_completo ),
      propiedades ( direccion )
    `)
    .eq('estado', 'activo')
    .in('tipo_ajuste', ['icl', 'ipc'])
    .not('fecha_proximo_aumento', 'is', null)
    .lte('fecha_proximo_aumento', limite)
    .order('fecha_proximo_aumento', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  const items = (data ?? [])
    .filter((row) => !row.fecha_fin || row.fecha_proximo_aumento <= row.fecha_fin)
    .map((row) => mapColaItem(row, hoy))
  const vencidos = items.filter((i) => i.es_vencido)
  const proximos = items.filter((i) => !i.es_vencido)

  return {
    data: { items, vencidos, proximos, total: items.length, fecha_referencia: hoy },
    error: null,
  }
}

/**
 * Historial de aumentos registrados de un contrato (trazabilidad).
 * Incluye aplicados y acordados/programados (aplicado=false), del más nuevo al más viejo.
 */
export async function listarHistorialAumentos(contratoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (contratoId == null) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('aumentos')
    .select(
      `
      id,
      contrato_id,
      fecha_aplicacion,
      monto_anterior,
      monto_nuevo,
      porcentaje_aplicado,
      indice_tipo,
      indice_valor_inicio,
      indice_valor_fin,
      modo,
      notas,
      aplicado,
      detalle_calculo,
      fecha_creacion
    `
    )
    .eq('contrato_id', contratoId)
    .order('fecha_aplicacion', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return { data: data ?? [], error: null }
}

export async function calcularAumentosPendientes({
  incluirProximos = false,
  diasProximos = 30,
  skipMaintenance = false,
} = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!skipMaintenance) {
    await ejecutarMantenimientoContratos()
  }

  const { data, error } = await supabase.rpc('calcular_aumentos_pendientes', {
    incluir_proximos: incluirProximos,
    dias_proximos: diasProximos,
  })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return { data, error: null }
}

export async function confirmarAumentos(propuestas) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const payload = propuestas.map((p) => ({
    contrato_id: p.contrato_id,
    monto_nuevo: p.monto_propuesto,
    modo: p.modo ?? 'calculado',
    indice_tipo: p.indice_tipo ?? 'icl',
    indice_valor_inicio: p.indice_valor_inicio,
    indice_valor_fin: p.indice_valor_fin,
    porcentaje_aplicado: p.variacion_pct,
    notas: p.notas ?? null,
  }))

  const { data, error } = await supabase.rpc('confirmar_aumentos', { payload })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return { data, error: null }
}

/**
 * Genera y sube un comprobante PDF por cada aumento confirmado.
 * Best-effort: no interrumpe el flujo si alguno falla.
 * @returns {Promise<{ generados: number, fallidos: number }>}
 */
export async function generarComprobantesAumentos(propuestas) {
  if (!supabase || !Array.isArray(propuestas) || propuestas.length === 0) {
    return { generados: 0, fallidos: 0 }
  }

  const ids = [...new Set(propuestas.map((p) => p.contrato_id).filter(Boolean))]
  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, propiedad_id')
    .in('id', ids)

  const propiedadPorContrato = new Map(
    (contratos ?? []).map((c) => [Number(c.id), c.propiedad_id])
  )

  // Recupera los ids de los aumentos recién registrados para linkear el comprobante.
  const { data: aumentosRecientes } = await supabase
    .from('aumentos')
    .select('id, contrato_id, fecha_aplicacion')
    .in('contrato_id', ids)

  const aumentoPorClave = new Map(
    (aumentosRecientes ?? []).map((a) => [
      `${Number(a.contrato_id)}|${a.fecha_aplicacion}`,
      a.id,
    ])
  )

  // Carga diferida: jspdf solo se descarga cuando realmente se genera un comprobante.
  const { generarComprobanteAumentoPdf } = await import('../utils/comprobanteAumentoPdf')

  let generados = 0
  let fallidos = 0

  for (const propuesta of propuestas) {
    const propiedadId = propiedadPorContrato.get(Number(propuesta.contrato_id))
    if (!propiedadId) {
      fallidos += 1
      continue
    }

    const fechaAplicacion = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento
    const aumentoId = aumentoPorClave.get(`${Number(propuesta.contrato_id)}|${fechaAplicacion}`)

    try {
      const { blob, filename } = generarComprobanteAumentoPdf(propuesta)
      const { error } = await subirComprobanteAumento({
        contratoId: propuesta.contrato_id,
        propiedadId,
        aumentoId,
        blob,
        filename,
        nombre: filename,
      })
      if (error) fallidos += 1
      else generados += 1
    } catch {
      fallidos += 1
    }
  }

  return { generados, fallidos }
}

/**
 * Deshace un aumento (admin). Revierte el contrato si estaba aplicado y borra
 * el comprobante PDF asociado (best-effort para el comprobante).
 */
export async function deshacerAumento(aumento) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const aumentoId = aumento?.id
  if (aumentoId == null) {
    return { data: null, error: { message: 'Aumento inválido' } }
  }

  const { data, error } = await supabase.rpc('deshacer_aumento', { p_aumento_id: aumentoId })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  // Limpia el comprobante asociado (no interrumpe si falla la limpieza).
  await eliminarComprobanteAumento({
    aumentoId,
    contratoId: aumento.contrato_id,
    fechaAplicacion: aumento.fecha_aplicacion,
  })

  return { data, error: null }
}

function rangoMesIso(claveMes) {
  const [y, m] = claveMes.split('-').map(Number)
  const mm = String(m).padStart(2, '0')
  const desde = `${y}-${mm}-01`
  const dd = String(new Date(y, m, 0).getDate()).padStart(2, '0')
  const hasta = `${y}-${mm}-${dd}`
  return { desde, hasta }
}

/**
 * Aumentos confirmados (acordados o aplicados) cuya fecha de aplicación cae en el mes indicado.
 * Fuente de verdad para la pestaña Confirmados del período operativo.
 */
export async function listarAumentosConfirmadosEnPeriodo({ claveMes }) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!claveMes) {
    return { data: [], error: null }
  }

  const { desde, hasta } = rangoMesIso(claveMes)

  const { data, error } = await supabase
    .from('aumentos')
    .select(
      `
      id,
      contrato_id,
      fecha_aplicacion,
      monto_anterior,
      monto_nuevo,
      porcentaje_aplicado,
      indice_tipo,
      modo,
      notas,
      aplicado,
      detalle_calculo,
      fecha_creacion,
      contratos (
        id,
        inquilinos ( nombre_completo ),
        propiedades ( direccion )
      )
    `
    )
    .gte('fecha_aplicacion', desde)
    .lte('fecha_aplicacion', hasta)
    .order('fecha_aplicacion', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  const items = (data ?? []).map((row) => ({
    ...row,
    inquilino_nombre: row.contratos?.inquilinos?.nombre_completo ?? null,
    propiedad_direccion: row.contratos?.propiedades?.direccion ?? null,
  }))

  return { data: items, error: null }
}

/**
 * Historial global de aumentos (todos los contratos) con datos de inquilino y
 * propiedad para la tabla filtrable por período. Solo admin (RLS).
 */
export async function listarHistorialGlobalAumentos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('aumentos')
    .select(
      `
      id,
      contrato_id,
      fecha_aplicacion,
      monto_anterior,
      monto_nuevo,
      porcentaje_aplicado,
      indice_tipo,
      modo,
      notas,
      aplicado,
      detalle_calculo,
      fecha_creacion,
      contratos (
        id,
        inquilinos ( nombre_completo ),
        propiedades ( direccion )
      )
    `
    )
    .order('fecha_aplicacion', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  const items = (data ?? []).map((row) => ({
    ...row,
    inquilino_nombre: row.contratos?.inquilinos?.nombre_completo ?? null,
    propiedad_direccion: row.contratos?.propiedades?.direccion ?? null,
  }))

  return { data: items, error: null }
}
