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

const key = serviceRoleKey || anonKey
const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: inquilinos, error } = await sb
  .from('inquilinos')
  .select('id, nombre_completo, perfil_id, dni_cuit')
  .order('id')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(JSON.stringify(inquilinos, null, 2))

const { data: perfiles } = await sb.from('perfiles').select('id, email, rol').eq('rol', 'inquilino')
console.log('\nPerfiles inquilino:', JSON.stringify(perfiles, null, 2))
