import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  return Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '')
        return [key, value]
      })
  )
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '')
const anonKey = env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

const email = process.argv[2] || 'inquilino1@inmobi.local'
const password = process.argv[3] || 'inquilino1'
const inquilinoIdArg = process.argv[4] ? Number(process.argv[4]) : null

if (!url || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

async function createWithServiceRole() {
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw new Error(`No se pudo listar usuarios: ${listError.message}`)

  const existing = existingUsers.users.find((user) => user.email === email)
  let userId = existing?.id

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`)
    userId = data.user.id
    console.log('Usuario creado en Auth:', userId)
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`No se pudo actualizar el usuario: ${error.message}`)
    console.log('Usuario ya existía, contraseña actualizada:', userId)
  }

  const { data: perfil, error: perfilError } = await admin
    .from('perfiles')
    .upsert({ id: userId, email, rol: 'inquilino' }, { onConflict: 'id' })
    .select('id, email, rol')
    .single()

  if (perfilError) {
    throw new Error(`No se pudo asignar rol inquilino en perfiles: ${perfilError.message}`)
  }

  console.log('Perfil inquilino listo:', perfil)

  let inquilinoId = inquilinoIdArg

  if (!inquilinoId) {
    const { data: sinVincular, error: buscarError } = await admin
      .from('inquilinos')
      .select('id, nombre_completo, perfil_id')
      .is('perfil_id', null)
      .order('id')
      .limit(1)
      .maybeSingle()

    if (buscarError) throw new Error(`No se pudo buscar inquilino: ${buscarError.message}`)
    if (sinVincular) {
      inquilinoId = sinVincular.id
      console.log(`Vinculando a inquilino existente sin portal: ${sinVincular.nombre_completo} (id ${inquilinoId})`)
    }
  }

  if (inquilinoId) {
    const { data: inquilino, error: vincularError } = await admin
      .from('inquilinos')
      .update({ perfil_id: userId })
      .eq('id', inquilinoId)
      .select('id, nombre_completo, perfil_id, dni_cuit, telefono')
      .single()

    if (vincularError) {
      throw new Error(`No se pudo vincular inquilino id ${inquilinoId}: ${vincularError.message}`)
    }

    console.log('Inquilino vinculado:', inquilino)
  } else {
    const { data: inquilino, error: crearError } = await admin
      .from('inquilinos')
      .insert({
        nombre_completo: 'Inquilino Demo Portal',
        dni_cuit: '30123456',
        telefono: '3515550000',
        perfil_id: userId,
      })
      .select('id, nombre_completo, perfil_id, dni_cuit, telefono')
      .single()

    if (crearError) {
      throw new Error(`No se pudo crear registro en inquilinos: ${crearError.message}`)
    }

    console.log('Inquilino creado y vinculado:', inquilino)
  }
}

async function createWithSignUp() {
  const supabase = createClient(url, anonKey)
  let userId

  const { data: signData, error: signError } = await supabase.auth.signUp({ email, password })
  if (signError) {
    const alreadyRegistered = /already registered|already exists|User already registered/i.test(
      signError.message
    )
    if (!alreadyRegistered) throw new Error(`SignUp falló: ${signError.message}`)

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (loginError) throw new Error(`El usuario ya existe pero el login falló: ${loginError.message}`)
    userId = loginData.user?.id
  } else {
    userId = signData.user?.id
  }

  if (!userId) throw new Error('No se pudo obtener el user id')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .insert({ id: userId, email, rol: 'inquilino' })
    .select('id, email, rol')
    .single()

  if (perfilError) {
    throw new Error(
      `Usuario creado (${userId}) pero no se pudo insertar perfiles: ${perfilError.message}. Agregá SUPABASE_SERVICE_ROLE_KEY al .env y volvé a ejecutar.`
    )
  }

  console.log('Perfil inquilino listo:', perfil)
  console.warn(
    'Sin service role no se puede vincular perfil_id en inquilinos automáticamente. Hacelo manual en Supabase o agregá SUPABASE_SERVICE_ROLE_KEY.'
  )
}

try {
  if (serviceRoleKey) {
    await createWithServiceRole()
  } else {
    await createWithSignUp()
  }

  const supabase = createClient(url, anonKey)
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  if (loginError) throw new Error(`Login de verificación falló: ${loginError.message}`)

  console.log('\nVerificación OK. Credenciales para el portal inquilino:')
  console.log('  Email:', email)
  console.log('  Contraseña:', password)
  console.log('  URL local: http://localhost:5173/login')
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
