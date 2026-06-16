import { supabase } from '../supabaseClient'

const ARGLY_ICL_RANGE = 'https://api.argly.com.ar/api/icl/range'
const ARGLY_IPC_RANGE = 'https://api.argly.com.ar/api/ipc/range'

async function invokeSyncIcl(body) {
  return supabase.functions.invoke('sync-argly-icl', { body })
}

async function parseInvokeError(error) {
  let message = error.message ?? 'Error al sincronizar ICL con Argly'
  if (error.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json()
      if (payload?.error) message = payload.error
    } catch {
      // respuesta no JSON
    }
  }
  return message
}

function hoyIsoLocal() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function arglyFechaToIso(fecha) {
  const parts = String(fecha).trim().split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (!day || !month || !year) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function rangoConsultaIpc(hoy) {
  const [year, month] = hoy.split('-')
  return { desde: `${year}-01`, hasta: `${year}-${month}` }
}

function rangoConsultaIcl(hoy) {
  const year = Number(hoy.slice(0, 4))
  return { desde: `${year - 1}-01-01`, hasta: hoy }
}

async function fetchArglyJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Argly respondió ${res.status}`)
  }
  return res.json()
}

function ultimoIpcDesdeFilas(filas) {
  const validas = (filas ?? [])
    .map((row) => {
      const anio = Number(row.anio)
      const mes = Number(row.mes)
      const valor = Number(row.valor)
      if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null
      if (!Number.isFinite(valor) || valor <= 0) return null
      return { anio, mes, valor }
    })
    .filter(Boolean)
    .sort((a, b) => (a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes))

  return validas.at(-1) ?? null
}

function ultimoIclDesdeFilas(filas) {
  const validas = (filas ?? [])
    .map((row) => {
      const fecha = arglyFechaToIso(row.fecha)
      const valor = Number(row.valor)
      if (!fecha || !Number.isFinite(valor) || valor <= 0) return null
      return { fecha, valor }
    })
    .filter(Boolean)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return validas.at(-1) ?? null
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function mapIpcArglyAnual(filas) {
  return (filas ?? [])
    .map((row) => {
      const anio = Number(row.anio)
      const mes = Number(row.mes)
      const valor = Number(row.valor)
      if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null
      if (!Number.isFinite(valor) || valor <= 0) return null
      return { anio, mes, valor }
    })
    .filter(Boolean)
    .sort((a, b) => (a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes))
    .map((row) => ({
      mes: MESES_CORTOS[row.mes - 1] ?? String(row.mes),
      valor: row.valor,
    }))
}

function rangoIpcAnual(anio, hoy = hoyIsoLocal()) {
  const currentYear = Number(hoy.slice(0, 4))
  const desde = `${anio}-01`
  const hasta = anio === currentYear ? `${anio}-${hoy.slice(5, 7)}` : `${anio}-12`
  return { desde, hasta }
}

/** Serie mensual de IPC del año desde Argly (INDEC), sin leer la tabla local. */
export async function obtenerIpcAnualArgly(anio = new Date().getFullYear()) {
  const { desde, hasta } = rangoIpcAnual(anio)

  try {
    const json = await fetchArglyJson(
      `${ARGLY_IPC_RANGE}?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
    )

    return {
      data: {
        anio,
        ipcAnual: mapIpcArglyAnual(json.data),
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: { message: err.message ?? 'No se pudo consultar Argly' },
    }
  }
}

/** Últimos valores publicados en Argly (INDEC/BCRA), sin leer la tabla local. */
export async function obtenerUltimosIndicesArgly() {
  const hoy = hoyIsoLocal()
  const ipcRango = rangoConsultaIpc(hoy)
  const iclRango = rangoConsultaIcl(hoy)

  try {
    const [ipcJson, iclJson] = await Promise.all([
      fetchArglyJson(
        `${ARGLY_IPC_RANGE}?desde=${encodeURIComponent(ipcRango.desde)}&hasta=${encodeURIComponent(ipcRango.hasta)}`
      ),
      fetchArglyJson(
        `${ARGLY_ICL_RANGE}?desde=${encodeURIComponent(iclRango.desde)}&hasta=${encodeURIComponent(iclRango.hasta)}`
      ),
    ])

    return {
      data: {
        icl: ultimoIclDesdeFilas(iclJson.data),
        ipc: ultimoIpcDesdeFilas(ipcJson.data),
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: { message: err.message ?? 'No se pudo consultar Argly' },
    }
  }
}

export async function syncIndices({ incluirProximos = false, diasProximos = 30 } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const body = { incluir_proximos: incluirProximos, dias_proximos: diasProximos }

  let { data, error } = await invokeSyncIcl(body)

  if (error) {
    ;({ data, error } = await invokeSyncIcl(body))
  }

  if (error) {
    return { data: null, error: { message: await parseInvokeError(error) } }
  }

  if (data?.error) {
    return { data: null, error: { message: data.error } }
  }

  return { data, error: null }
}

/** @deprecated alias */
export const syncIcl = syncIndices
