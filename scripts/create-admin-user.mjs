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
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
        return [key, value]
      })
  )
}

// Crea (o actualiza) la cuenta del Administrador de sistema. Es el único rol que no se da de
// alta desde la pantalla Cuentas: hace falta la service role, que nunca va al navegador.
// Uso: node scripts/create-admin-user.mjs <email> <contraseña de al menos 8 caracteres>
const env = loadEnv()
const url = env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '')
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

const [email, password] = process.argv.slice(2)

if (!url || !serviceRoleKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
if (!email || !password || password.length < 8) {
  console.error('Uso: node scripts/create-admin-user.mjs <email> <contraseña de al menos 8 caracteres>')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

try {
  const { data: existentes, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(`No se pudo listar usuarios: ${listError.message}`)

  let userId = existentes.users.find((user) => user.email === email)?.id

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { rol: 'admin' },
    })
    if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`)
    userId = data.user.id
    console.log('Usuario creado en Auth:', userId)
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      app_metadata: { rol: 'admin' },
    })
    if (error) throw new Error(`No se pudo actualizar el usuario: ${error.message}`)
    console.log('El usuario ya existía: contraseña actualizada.', userId)
  }

  const { error: perfilError } = await admin.from('perfiles').upsert({ id: userId, rol: 'admin' })
  if (perfilError) throw new Error(`No se pudo asignar el rol admin: ${perfilError.message}`)

  console.log(`Listo: ${email} es Administrador de sistema.`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
