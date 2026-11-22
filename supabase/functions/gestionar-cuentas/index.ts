import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Administración de cuentas (Administrador de sistema). Usa la service role del lado del
// servidor: la clave nunca viaja al navegador.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES_ASIGNABLES = ['encargado', 'inquilino', 'propietario'] as const
type RolAsignable = (typeof ROLES_ASIGNABLES)[number]

// Las cuentas de portal se vinculan con su ficha: la del inquilino o la del propietario.
const FICHAS = {
  inquilino: { tabla: 'inquilinos', persona: 'inquilino' },
  propietario: { tabla: 'propietarios', persona: 'propietario' },
} as const
type RolConFicha = keyof typeof FICHAS
const tieneFicha = (rol: string | null): rol is RolConFicha => rol === 'inquilino' || rol === 'propietario'

const BLOQUEO_INDEFINIDO = '876000h'
const MIN_PASSWORD = 8

class ErrorNegocio extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
}

function validarRol(rol: unknown): RolAsignable {
  if (!ROLES_ASIGNABLES.includes(rol as RolAsignable)) {
    throw new ErrorNegocio('El rol debe ser Encargado de Alquileres, Inquilino o Propietario')
  }
  return rol as RolAsignable
}

function validarPassword(password: unknown): string {
  const valor = String(password ?? '')
  if (valor.length < MIN_PASSWORD) {
    throw new ErrorNegocio(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
  }
  return valor
}

async function rolDe(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.from('perfiles').select('rol').eq('id', userId).maybeSingle()
  return data?.rol ?? null
}

async function cuentaModificable(admin: SupabaseClient, userId: unknown, solicitante: string) {
  const id = String(userId ?? '')
  if (!id) throw new ErrorNegocio('Falta la cuenta')
  if (id === solicitante) throw new ErrorNegocio('No podés modificar tu propia cuenta desde acá')
  const rol = await rolDe(admin, id)
  if (rol === 'admin') {
    throw new ErrorNegocio('Las cuentas de Administrador de sistema no se modifican desde esta pantalla')
  }
  return { id, rol }
}

/** Verifica que la ficha exista y no tenga otra cuenta. Devuelve su id. */
async function fichaLibre(admin: SupabaseClient, rol: RolConFicha, fichaId: unknown, userId: string | null) {
  const { tabla, persona } = FICHAS[rol]
  const id = Number(fichaId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new ErrorNegocio(`Elegí la ficha del ${persona} a la que pertenece la cuenta`)
  }
  const { data: ficha, error } = await admin.from(tabla).select('id, perfil_id').eq('id', id).maybeSingle()
  if (error) throw error
  if (!ficha) throw new ErrorNegocio(`La ficha del ${persona} no existe`)
  if (ficha.perfil_id && ficha.perfil_id !== userId) {
    throw new ErrorNegocio(`Ese ${persona} ya tiene una cuenta para el portal`)
  }
  return id
}

/** Deja la cuenta vinculada solo con la ficha de su rol (o con ninguna, si el rol no tiene ficha). */
async function vincularFicha(admin: SupabaseClient, userId: string, rol: RolAsignable, fichaId: unknown) {
  for (const otro of Object.keys(FICHAS) as RolConFicha[]) {
    if (otro === rol) continue
    const { error } = await admin.from(FICHAS[otro].tabla).update({ perfil_id: null }).eq('perfil_id', userId)
    if (error) throw error
  }
  if (!tieneFicha(rol)) return

  const { tabla } = FICHAS[rol]
  const id = await fichaLibre(admin, rol, fichaId, userId)
  const { error: errLiberar } = await admin.from(tabla).update({ perfil_id: null }).eq('perfil_id', userId).neq('id', id)
  if (errLiberar) throw errLiberar
  const { error } = await admin.from(tabla).update({ perfil_id: userId }).eq('id', id)
  if (error) throw error
}

type Ficha = { id: number; nombre_completo: string; dni_cuit: string; email: string | null; perfil_id: string | null }

async function listar(admin: SupabaseClient) {
  const { data: usuarios, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  const columnas = 'id, nombre_completo, dni_cuit, email, perfil_id'
  const [perfilesRes, inquilinosRes, propietariosRes] = await Promise.all([
    admin.from('perfiles').select('id, rol'),
    admin.from('inquilinos').select(columnas).order('nombre_completo'),
    admin.from('propietarios').select(columnas).order('nombre_completo'),
  ])
  if (perfilesRes.error) throw perfilesRes.error
  if (inquilinosRes.error) throw inquilinosRes.error
  if (propietariosRes.error) throw propietariosRes.error

  const inquilinos = (inquilinosRes.data ?? []) as Ficha[]
  const propietarios = (propietariosRes.data ?? []) as Ficha[]
  const rolPorId = new Map((perfilesRes.data ?? []).map((p) => [p.id, p.rol]))

  const fichaPorPerfil = new Map<string, { tipo: RolConFicha; id: number; nombre_completo: string; dni_cuit: string }>()
  const indexar = (tipo: RolConFicha, filas: Ficha[]) => {
    for (const f of filas) {
      if (f.perfil_id) fichaPorPerfil.set(f.perfil_id, { tipo, id: f.id, nombre_completo: f.nombre_completo, dni_cuit: f.dni_cuit })
    }
  }
  indexar('inquilino', inquilinos)
  indexar('propietario', propietarios)

  const ahora = Date.now()
  const cuentas = usuarios.users.map((u) => {
    const bannedUntil = (u as { banned_until?: string | null }).banned_until ?? null
    return {
      id: u.id,
      email: u.email,
      rol: rolPorId.get(u.id) ?? null,
      bloqueado: Boolean(bannedUntil && new Date(bannedUntil).getTime() > ahora),
      creado: u.created_at,
      ultimo_ingreso: u.last_sign_in_at ?? null,
      ficha: fichaPorPerfil.get(u.id) ?? null,
    }
  })

  const sinCuenta = (filas: Ficha[]) =>
    filas.filter((f) => !f.perfil_id).map(({ id, nombre_completo, dni_cuit, email }) => ({ id, nombre_completo, dni_cuit, email }))

  return {
    cuentas,
    inquilinosSinCuenta: sinCuenta(inquilinos),
    propietariosSinCuenta: sinCuenta(propietarios),
  }
}

async function crear(admin: SupabaseClient, body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorNegocio('El email no es válido')
  const password = validarPassword(body.password)
  const rol = validarRol(body.rol)
  if (tieneFicha(rol)) await fichaLibre(admin, rol, body.ficha_id, null)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { rol },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new ErrorNegocio('Ya existe una cuenta con ese email')
    }
    throw error
  }

  const userId = data.user.id
  try {
    const { error: errPerfil } = await admin.from('perfiles').upsert({ id: userId, rol })
    if (errPerfil) throw errPerfil
    await vincularFicha(admin, userId, rol, body.ficha_id)
  } catch (err) {
    await admin.auth.admin.deleteUser(userId)
    throw err
  }

  return { id: userId }
}

async function cambiarRol(admin: SupabaseClient, body: Record<string, unknown>, solicitante: string) {
  const { id } = await cuentaModificable(admin, body.user_id, solicitante)
  const rol = validarRol(body.rol)
  if (tieneFicha(rol)) await fichaLibre(admin, rol, body.ficha_id, id)

  // El perfil va primero: la ficha del propietario referencia a perfiles.
  const { error } = await admin.from('perfiles').upsert({ id, rol })
  if (error) throw error
  await vincularFicha(admin, id, rol, body.ficha_id)
  await admin.auth.admin.updateUserById(id, { app_metadata: { rol } })
  return { id, rol }
}

/** Modifica la cuenta (CU-062): el email de acceso y, si se indica, el rol y la ficha vinculada. */
async function modificar(admin: SupabaseClient, body: Record<string, unknown>, solicitante: string) {
  const { id } = await cuentaModificable(admin, body.user_id, solicitante)
  if (body.email != null) {
    const email = String(body.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorNegocio('El email no es válido')
    const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new ErrorNegocio('Ya existe una cuenta con ese email')
      throw error
    }
  }
  if (body.rol != null) return cambiarRol(admin, body, solicitante)
  return { id }
}

async function bloquear(admin: SupabaseClient, body: Record<string, unknown>, solicitante: string) {
  const { id } = await cuentaModificable(admin, body.user_id, solicitante)
  const bloquearCuenta = Boolean(body.bloquear)
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: bloquearCuenta ? BLOQUEO_INDEFINIDO : 'none',
  })
  if (error) throw error
  return { id, bloqueado: bloquearCuenta }
}

async function restablecer(admin: SupabaseClient, body: Record<string, unknown>, solicitante: string) {
  const { id } = await cuentaModificable(admin, body.user_id, solicitante)
  const password = validarPassword(body.password)
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) throw error
  return { id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo no permitido' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'No autorizado' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const cliente = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: sesion, error: errSesion } = await cliente.auth.getUser()
  if (errSesion || !sesion?.user) return jsonResponse({ error: 'Sesión inválida' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  if ((await rolDe(admin, sesion.user.id)) !== 'admin') {
    return jsonResponse({ error: 'Solo el Administrador de sistema puede administrar cuentas' }, 403)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  try {
    switch (body.accion) {
      case 'listar':
        return jsonResponse(await listar(admin))
      case 'crear':
        return jsonResponse(await crear(admin, body))
      case 'cambiar_rol':
        return jsonResponse(await cambiarRol(admin, body, sesion.user.id))
      case 'modificar':
        return jsonResponse(await modificar(admin, body, sesion.user.id))
      case 'bloquear':
        return jsonResponse(await bloquear(admin, body, sesion.user.id))
      case 'restablecer_password':
        return jsonResponse(await restablecer(admin, body, sesion.user.id))
      default:
        return jsonResponse({ error: 'Acción no válida' }, 400)
    }
  } catch (err) {
    if (err instanceof ErrorNegocio) return jsonResponse({ error: err.message }, err.status)
    console.error('[gestionar-cuentas]', err)
    return jsonResponse({ error: 'No se pudo completar la operación' }, 500)
  }
})
