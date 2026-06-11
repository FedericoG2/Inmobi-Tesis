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
const email = process.argv[2] || 'inquilino1@inmobi.local'
const password = process.argv[3] || 'inquilino1'

const sb = createClient(url, anonKey)

const { data: auth, error: loginError } = await sb.auth.signInWithPassword({ email, password })
if (loginError) {
  console.error('Login falló:', loginError.message)
  process.exit(1)
}

const userId = auth.user.id
console.log('Login OK, userId:', userId)

const { data: perfil, error: perfilError } = await sb
  .from('perfiles')
  .select('id, email, rol')
  .eq('id', userId)
  .single()

console.log('Perfil:', perfil, perfilError?.message)

const { data: inquilino, error: inqError } = await sb
  .from('inquilinos')
  .select('id, nombre_completo, perfil_id, dni_cuit')
  .eq('perfil_id', userId)
  .maybeSingle()

console.log('Inquilino vinculado:', inquilino, inqError?.message)

const { data: contratos, error: cError } = inquilino
  ? await sb
      .from('contratos')
      .select('id, activo, propiedad_id, propiedades(direccion)')
      .eq('inquilino_id', inquilino.id)
      .eq('activo', true)
  : { data: null, error: null }

console.log('Contratos activos:', contratos, cError?.message)
