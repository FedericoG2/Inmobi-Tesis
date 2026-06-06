import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ARGLY_ICL_RANGE = 'https://api.argly.com.ar/api/icl/range'
const ARGLY_IPC_RANGE = 'https://api.argly.com.ar/api/ipc/range'
const MARGEN_DIAS_DESDE = 7
const TIPOS_AJUSTE_INDICES = ['icl', 'ipc'] as const

type ArglyIclRow = { fecha: string; valor: number }
type ArglyIpcRow = { mes: number; anio: number; valor: number }

type ContratoPendiente = {
  fecha_inicio: string
  fecha_ultimo_aumento: string | null
  fecha_proximo_aumento: string
  tipo_ajuste: string
}

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

function isoToYearMonth(iso: string): string {
  return iso.slice(0, 7)
}

function subtractOneMonthYearMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}`
}

function minYearMonth(a: string, b: string): string {
  return a <= b ? a : b
}

function maxYearMonth(a: string, b: string): string {
  return a >= b ? a : b
}

function filtrarPendientes(
  contratos: ContratoPendiente[],
  tipoAjuste: string,
  hoy: string,
  incluirProximos: boolean,
  diasProximos: number
) {
  return contratos.filter((c) => {
    if (c.tipo_ajuste !== tipoAjuste) return false
    const fp = c.fecha_proximo_aumento
    if (fp <= hoy) return true
    if (!incluirProximos) return false
    const limite = new Date()
    limite.setDate(limite.getDate() + diasProximos)
    return fp <= limite.toISOString().slice(0, 10)
  })
}

function rangoIcl(pendientes: ContratoPendiente[], hoy: string) {
  if (pendientes.length === 0) {
    return { desde: null as string | null, hasta: null as string | null }
  }

  let minDesde = pendientes[0].fecha_inicio
  let maxHasta = pendientes[0].fecha_proximo_aumento

  for (const c of pendientes) {
    const fd = c.fecha_ultimo_aumento ?? c.fecha_inicio
    const fh = c.fecha_proximo_aumento
    if (fd < minDesde) minDesde = fd
    if (fh > maxHasta) maxHasta = fh
  }

  const desdeDate = new Date(minDesde)
  desdeDate.setDate(desdeDate.getDate() - MARGEN_DIAS_DESDE)

  return {
    desde: desdeDate.toISOString().slice(0, 10),
    hasta: maxHasta > hoy ? maxHasta : hoy,
  }
}

function rangoIpc(pendientes: ContratoPendiente[]) {
  if (pendientes.length === 0) {
    return { desde: null as string | null, hasta: null as string | null }
  }

  let minYm = isoToYearMonth(pendientes[0].fecha_ultimo_aumento ?? pendientes[0].fecha_inicio)
  let maxYm = subtractOneMonthYearMonth(isoToYearMonth(pendientes[0].fecha_proximo_aumento))

  for (const c of pendientes) {
    const fdYm = isoToYearMonth(c.fecha_ultimo_aumento ?? c.fecha_inicio)
    const fhYm = subtractOneMonthYearMonth(isoToYearMonth(c.fecha_proximo_aumento))
    minYm = minYearMonth(minYm, fdYm)
    maxYm = maxYearMonth(maxYm, fhYm)
  }

  return { desde: minYm, hasta: maxYm }
}

async function syncIclRange(
  supabaseAdmin: ReturnType<typeof createClient>,
  desde: string,
  hasta: string
) {
  const arglyUrl = `${ARGLY_ICL_RANGE}?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
  const arglyRes = await fetch(arglyUrl)

  if (!arglyRes.ok) {
    return { error: `Argly ICL respondio ${arglyRes.status}`, filas: 0, desde, hasta }
  }

  const arglyJson = (await arglyRes.json()) as { data?: ArglyIclRow[] }
  const upsertRows = (arglyJson.data ?? [])
    .map((row) => {
      const iso = arglyFechaToIso(row.fecha)
      const valor = Number(row.valor)
      if (!iso || !Number.isFinite(valor) || valor <= 0) return null
      return { fecha: iso, valor, fuente: 'argly' }
    })
    .filter(Boolean)

  if (upsertRows.length === 0) {
    return {
      filas: 0,
      desde,
      hasta,
      mensaje: 'Argly no devolvio filas ICL validas en el rango',
    }
  }

  const { data: filas, error: upsertError } = await supabaseAdmin.rpc('upsert_indices_icl_batch', {
    rows: upsertRows,
  })

  if (upsertError) {
    return { error: upsertError.message, filas: 0, desde, hasta }
  }

  return { filas: filas ?? upsertRows.length, desde, hasta }
}

async function syncIpcRange(
  supabaseAdmin: ReturnType<typeof createClient>,
  desde: string,
  hasta: string
) {
  const arglyUrl = `${ARGLY_IPC_RANGE}?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
  const arglyRes = await fetch(arglyUrl)

  if (!arglyRes.ok) {
    return { error: `Argly IPC respondio ${arglyRes.status}`, filas: 0, desde, hasta }
  }

  const arglyJson = (await arglyRes.json()) as { data?: ArglyIpcRow[] }
  const upsertRows = (arglyJson.data ?? [])
    .map((row) => {
      const anio = Number(row.anio)
      const mes = Number(row.mes)
      const valor = Number(row.valor)
      if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null
      if (!Number.isFinite(valor) || valor <= 0) return null
      return { anio, mes, valor, fuente: 'argly' }
    })
    .filter(Boolean)

  if (upsertRows.length === 0) {
    return {
      filas: 0,
      desde,
      hasta,
      mensaje: 'Argly no devolvio filas IPC validas en el rango',
    }
  }

  const { data: filas, error: upsertError } = await supabaseAdmin.rpc('upsert_indices_ipc_batch', {
    rows: upsertRows,
  })

  if (upsertError) {
    return { error: upsertError.message, filas: 0, desde, hasta }
  }

  return { filas: filas ?? upsertRows.length, desde, hasta }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo no permitido' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase no configurado en Edge Function' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'No autorizado' }, 401)
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Sesion invalida' }, 401)
  }

  const { data: perfil, error: perfilError } = await supabaseUser
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfilError || perfil?.rol !== 'admin') {
    return jsonResponse({ error: 'Solo administradores pueden sincronizar indices' }, 403)
  }

  let body: {
    incluir_proximos?: boolean
    dias_proximos?: number
  } = {}

  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const incluirProximos = body.incluir_proximos === true
  const diasProximos = typeof body.dias_proximos === 'number' ? body.dias_proximos : 30
  const hoy = new Date().toISOString().slice(0, 10)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: contratos, error: contratosError } = await supabaseAdmin
    .from('contratos')
    .select('fecha_inicio, fecha_ultimo_aumento, fecha_proximo_aumento, tipo_ajuste')
    .eq('activo', true)
    .in('tipo_ajuste', TIPOS_AJUSTE_INDICES)
    .not('fecha_proximo_aumento', 'is', null)

  if (contratosError) {
    return jsonResponse({ error: contratosError.message }, 500)
  }

  const lista = (contratos ?? []) as ContratoPendiente[]
  const pendientesIcl = filtrarPendientes(lista, 'icl', hoy, incluirProximos, diasProximos)
  const pendientesIpc = filtrarPendientes(lista, 'ipc', hoy, incluirProximos, diasProximos)

  let iclResult: Record<string, unknown> = {
    filas: 0,
    desde: null,
    hasta: null,
    mensaje: 'No hay contratos ICL pendientes para sincronizar',
  }

  let ipcResult: Record<string, unknown> = {
    filas: 0,
    desde: null,
    hasta: null,
    mensaje: 'No hay contratos IPC pendientes para sincronizar',
  }

  if (pendientesIcl.length > 0) {
    const { desde, hasta } = rangoIcl(pendientesIcl, hoy)
    if (desde && hasta) {
      try {
        iclResult = await syncIclRange(supabaseAdmin, desde, hasta)
      } catch {
        iclResult = { error: 'No se pudo conectar con Argly ICL', filas: 0, desde, hasta }
      }
    }
  }

  if (pendientesIpc.length > 0) {
    const { desde, hasta } = rangoIpc(pendientesIpc)
    if (desde && hasta) {
      try {
        ipcResult = await syncIpcRange(supabaseAdmin, desde, hasta)
      } catch {
        ipcResult = { error: 'No se pudo conectar con Argly IPC', filas: 0, desde, hasta }
      }
    }
  }

  return jsonResponse({
    icl: iclResult,
    ipc: ipcResult,
    filas: (Number(iclResult.filas) || 0) + (Number(ipcResult.filas) || 0),
  })
})
