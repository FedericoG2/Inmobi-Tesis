import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Administración de cuentas (Administrador de sistema). Usa la service role del lado del
// servidor: la clave nunca viaja al navegador.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES_ASIGNABLES = ['encargado', 'inquilino'] as const
type RolAsignable = (typeof ROLES_ASIGNABLES)[number]
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
    throw new ErrorNegocio('El rol debe ser Encargado de Alquileres o inquilino')
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

async function vincularInquilino(admin: SupabaseClient, userId: string, inquilinoId: unknown) {
  const id = Number(inquilinoId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new ErrorNegocio('Elegí la ficha del inquilino a la que pertenece la cuenta')
  }
  const { data: ficha, error } = await admin
    .from('inquilinos')
    .select('id, perfil_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!ficha) throw new ErrorNegocio('La ficha del inquilino no existe')
  if (ficha.perfil_id && ficha.perfil_id !== userId) {
    throw new ErrorNegocio('Ese inquilino ya tiene una cuenta para el portal')
  }

  await admin.from('inquilinos').update({ perfil_id: null }).eq('perfil_id', userId).neq('id', id)
  const { error: errUpd } = await admin.from('inquilinos').update({ perfil_id: userId }).eq('id', id)
  if (errUpd) throw errUpd
}

async function listar(admin: SupabaseClient) {
  const { data: usuarios, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  const [{ data: perfiles, error: errPerfiles }, { data: inquilinos, error: errInq }] = await Promise.all([
    admin.from('perfiles').select('id, rol'),
    admin.from('inquilinos').select('id, nombre_completo, dni_cuit, email, perfil_id').order('nombre_completo'),
  ])
  if (errPerfiles) throw errPerfiles
  if (errInq) throw errInq

  const rolPorId = new Map((perfiles ?? []).map((p) => [p.id, p.rol]))
  const inquilinoPorPerfil = new Map(
    (inquilinos ?? []).filter((i) => i.perfil_id).map((i) => [i.perfil_id, i])
  )
  const ahora = Date.now()

  const cuentas = usuarios.users.map((u) => {
    const ficha = inquilinoPorPerfil.get(u.id)
    const bannedUntil = (u as { banned_until?: string | null }).banned_until ?? null
    return {
      id: u.id,
      email: u.email,
      rol: rolPorId.get(u.id) ?? null,
      bloqueado: Boolean(bannedUntil && new Date(bannedUntil).getTime() > ahora),
      creado: u.created_at,
      ultimo_ingreso: u.last_sign_in_at ?? null,
      inquilino: ficha ? { id: ficha.id, nombre_completo: ficha.nombre_completo, dni_cuit: ficha.dni_cuit } : null,
    }
  })

  const inquilinosSinCuenta = (inquilinos ?? [])
    .filter((i) => !i.perfil_id)
    .map(({ id, nombre_completo, dni_cuit, email }) => ({ id, nombre_completo, dni_cuit, email }))

  return { cuentas, inquilinosSinCuenta }
}

async function crear(admin: SupabaseClient, body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorNegocio('El email no es válido')
  const password = validarPassword(body.password)
  const rol = validarRol(body.rol)

  if (rol === 'inquilino') {
    const { data: ficha } = await admin
      .from('inquilinos')
      .select('perfil_id')
      .eq('id', Number(body.inquilino_id))
      .maybeSingle()
    if (!ficha) throw new ErrorNegocio('Elegí la ficha del inquilino a la que pertenece la cuenta')
    if (ficha.perfil_id) throw new ErrorNegocio('Ese inquilino ya tiene una cuenta para el portal')
  }

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
    await admin.from('perfiles').upsert({ id: userId, rol })
    if (rol === 'inquilino') await vincularInquilino(admin, userId, body.inquilino_id)
  } catch (err) {
    await admin.auth.admin.deleteUser(userId)
    throw err
  }

  return { id: userId }
}

async function cambiarRol(admin: SupabaseClient, body: Record<string, unknown>, solicitante: string) {
  const { id } = await cuentaModificable(admin, body.user_id, solicitante)
  const rol = validarRol(body.rol)

  if (rol === 'inquilino') {
    await vincularInquilino(admin, id, body.inquilino_id)
  } else {
    await admin.from('inquilinos').update({ perfil_id: null }).eq('perfil_id', id)
  }

  const { error } = await admin.from('perfiles').upsert({ id, rol })
  if (error) throw error
  await admin.auth.admin.updateUserById(id, { app_metadata: { rol } })
  return { id, rol }
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
