import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const ARGLY_ICL_RANGE = 'https://api.argly.com.ar/api/icl/range'
const ARGLY_IPC_RANGE = 'https://api.argly.com.ar/api/ipc/range'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
}

function arglyFechaToIso(fecha: string): string | null {
  const parts = fecha.trim().split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (!day || !month || !year) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

type IclRango = { desde?: string | null; hasta?: string | null }
type IpcRango = { desde?: string | null; hasta?: string | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo no permitido' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'No autorizado' }, 401)
  }

  let body: { icl?: IclRango | null; ipc?: IpcRango | null } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const anio = Number(hoy.slice(0, 4))
  const icl = body.icl === null
    ? null
    : {
        desde: body.icl?.desde || `${anio - 1}-01-01`,
        hasta: body.icl?.hasta || hoy,
      }
  const ipc = body.ipc === null
    ? null
    : {
        desde: body.ipc?.desde || `${anio}-01`,
        hasta: body.ipc?.hasta || hoy.slice(0, 7),
      }

  try {
    const fetches: Promise<Response>[] = []
    if (ipc) {
      fetches.push(
        fetch(`${ARGLY_IPC_RANGE}?desde=${encodeURIComponent(ipc.desde)}&hasta=${encodeURIComponent(ipc.hasta)}`)
      )
    } else {
      fetches.push(Promise.resolve(new Response(JSON.stringify({ data: [] }))))
    }
    if (icl) {
      fetches.push(
        fetch(`${ARGLY_ICL_RANGE}?desde=${encodeURIComponent(icl.desde)}&hasta=${encodeURIComponent(icl.hasta)}`)
      )
    } else {
      fetches.push(Promise.resolve(new Response(JSON.stringify({ data: [] }))))
    }

    const [ipcRes, iclRes] = await Promise.all(fetches)

    if (ipc && !ipcRes.ok) {
      return jsonResponse({ error: `Argly IPC respondio ${ipcRes.status}` }, 502)
    }
    if (icl && !iclRes.ok) {
      return jsonResponse({ error: `Argly ICL respondio ${iclRes.status}` }, 502)
    }

    const ipcJson = (await ipcRes.json()) as { data?: Array<{ anio: number; mes: number; valor: number }> }
    const iclJson = (await iclRes.json()) as { data?: Array<{ fecha: string; valor: number }> }

    const ipcSerie = (ipcJson.data ?? [])
      .map((row) => {
        const anioRow = Number(row.anio)
        const mes = Number(row.mes)
        const valor = Number(row.valor)
        if (!Number.isFinite(anioRow) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null
        if (!Number.isFinite(valor) || valor <= 0) return null
        return { anio: anioRow, mes, valor }
      })
      .filter(Boolean)

    const iclSerie = (iclJson.data ?? [])
      .map((row) => {
        const iso = arglyFechaToIso(String(row.fecha))
        const valor = Number(row.valor)
        if (!iso || !Number.isFinite(valor) || valor <= 0) return null
        return { fecha: iso, valor }
      })
      .filter(Boolean)

    return jsonResponse({ icl: iclSerie, ipc: ipcSerie })
  } catch {
    return jsonResponse({ error: 'No se pudo consultar Argly' }, 502)
  }
})
