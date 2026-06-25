import { supabase } from '../supabaseClient'
import { activarContratosProgramados } from './contratosService'
import { subirComprobanteAumento } from './documentosService'

/** Aplica los aumentos acordados cuya fecha ya llegó (fallback del cron diario). */
async function aplicarAumentosProgramados() {
  if (!supabase) return
  await supabase.rpc('aplicar_aumentos_programados')
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

  await Promise.all([activarContratosProgramados(), aplicarAumentosProgramados()])

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

export async function calcularAumentosPendientes({ incluirProximos = false, diasProximos = 30 } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  await Promise.all([activarContratosProgramados(), aplicarAumentosProgramados()])

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

    try {
      const { blob, filename } = generarComprobanteAumentoPdf(propuesta)
      const { error } = await subirComprobanteAumento({
        contratoId: propuesta.contrato_id,
        propiedadId,
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
