import { supabase } from '../supabaseClient'

const ARGLY_ICL_RANGE = 'https://api.argly.com.ar/api/icl/range'
const ARGLY_IPC_RANGE = 'https://api.argly.com.ar/api/ipc/range'

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

async function parseInvokeError(error) {
  let message = error.message ?? 'Error al consultar índices en Argly'
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

async function fetchArglyJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Argly respondió ${res.status}`)
  }
  return res.json()
}

export function normalizarSerieIcl(filas) {
  return (filas ?? [])
    .map((row) => {
      const fecha = row.fecha?.includes('-') ? row.fecha : arglyFechaToIso(row.fecha)
      const valor = Number(row.valor)
      if (!fecha || !Number.isFinite(valor) || valor <= 0) return null
      return { fecha, valor }
    })
    .filter(Boolean)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function normalizarSerieIpc(filas) {
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
}

function ultimoIpcDesdeFilas(filas) {
  return normalizarSerieIpc(filas).at(-1) ?? null
}

function ultimoIclDesdeFilas(filas) {
  return normalizarSerieIcl(filas).at(-1) ?? null
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function mapIpcArglyAnual(filas) {
  return normalizarSerieIpc(filas).map((row) => ({
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

function rangoConsultaIpc(hoy) {
  const [year, month] = hoy.split('-')
  return { desde: `${year}-01`, hasta: `${year}-${month}` }
}

function rangoConsultaIcl(hoy) {
  const year = Number(hoy.slice(0, 4))
  return { desde: `${year - 1}-01-01`, hasta: hoy }
}

async function obtenerSeriesArglyViaEdge({ icl, ipc } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase.functions.invoke('obtener-indices-argly', {
    body: { icl, ipc },
  })

  if (error) {
    return { data: null, error: { message: await parseInvokeError(error) } }
  }

  if (data?.error) {
    return { data: null, error: { message: data.error } }
  }

  return {
    data: {
      icl: normalizarSerieIcl(data?.icl),
      ipc: normalizarSerieIpc(data?.ipc),
    },
    error: null,
  }
}

async function obtenerSeriesArglyDirecto({ icl, ipc } = {}) {
  const hoy = hoyIsoLocal()
  const iclRango = icl === null ? null : (icl ?? rangoConsultaIcl(hoy))
  const ipcRango = ipc === null ? null : (ipc ?? rangoConsultaIpc(hoy))

  const [ipcJson, iclJson] = await Promise.all([
    ipcRango?.desde && ipcRango?.hasta
      ? fetchArglyJson(
          `${ARGLY_IPC_RANGE}?desde=${encodeURIComponent(ipcRango.desde)}&hasta=${encodeURIComponent(ipcRango.hasta)}`
        )
      : Promise.resolve({ data: [] }),
    iclRango?.desde && iclRango?.hasta
      ? fetchArglyJson(
          `${ARGLY_ICL_RANGE}?desde=${encodeURIComponent(iclRango.desde)}&hasta=${encodeURIComponent(iclRango.hasta)}`
        )
      : Promise.resolve({ data: [] }),
  ])

  return {
    data: {
      icl: normalizarSerieIcl(iclJson.data),
      ipc: normalizarSerieIpc(ipcJson.data),
    },
    error: null,
  }
}

/** Series ICL/IPC desde Argly. Primero el navegador; si falla CORS/red, la Edge Function. */
export async function obtenerSeriesArgly(rangos = {}) {
  try {
    const directo = await obtenerSeriesArglyDirecto(rangos)
    if ((directo.data?.icl?.length ?? 0) > 0 || (directo.data?.ipc?.length ?? 0) > 0) {
      return directo
    }
  } catch {
    // Argly no siempre responde desde el navegador (CORS / red).
  }

  return obtenerSeriesArglyViaEdge(rangos)
}

/** Serie mensual de IPC del año (dashboard). Sin tabla local. */
export async function obtenerIpcAnualArgly(anio = new Date().getFullYear()) {
  const { desde, hasta } = rangoIpcAnual(anio)
  const { data, error } = await obtenerSeriesArgly({
    ipc: { desde, hasta },
    icl: null,
  })

  if (error) {
    return { data: null, error }
  }

  const ipcAnual = mapIpcArglyAnual(data?.ipc)
  if (ipcAnual.length === 0) {
    return { data: null, error: { message: 'Sin datos de IPC para el período' } }
  }

  return { data: { anio, ipcAnual }, error: null }
}

/** Últimos ICL/IPC publicados en Argly. */
export async function obtenerUltimosIndicesArgly() {
  const hoy = hoyIsoLocal()
  const { data, error } = await obtenerSeriesArgly({
    ipc: rangoConsultaIpc(hoy),
    icl: rangoConsultaIcl(hoy),
  })

  if (error) {
    return { data: null, error }
  }

  return {
    data: {
      icl: ultimoIclDesdeFilas(data?.icl),
      ipc: ultimoIpcDesdeFilas(data?.ipc),
    },
    error: null,
  }
}

/** @deprecated usar obtenerSeriesArgly / obtenerUltimosIndicesArgly */
export async function obtenerUltimosIndicesLocal() {
  return obtenerUltimosIndicesArgly()
}

/** @deprecated ya no se persiste en tabla `indices`. */
export async function syncIndices(rangos = {}) {
  return obtenerSeriesArgly(rangos)
}

/** @deprecated alias */
export const syncIcl = syncIndices
