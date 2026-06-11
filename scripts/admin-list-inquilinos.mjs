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

const sb = createClient(url, anonKey)
await sb.auth.signInWithPassword({ email: 'admin1@inmobi.local', password: 'admin1' })

const { data, error } = await sb
  .from('inquilinos')
  .select('id, nombre_completo, perfil_id, dni_cuit')
  .order('id')

console.log(JSON.stringify({ error: error?.message, data }, null, 2))
