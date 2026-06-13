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

const inquilinoId = Number(process.argv[2] || 6)
const perfilId = process.argv[3] || 'fb973cda-1733-4a65-aee9-8e18fa772ebf'

const sb = createClient(url, anonKey)
await sb.auth.signInWithPassword({ email: 'admin1@inmobi.local', password: 'admin1' })

const { data, error } = await sb
  .from('inquilinos')
  .update({ perfil_id: perfilId })
  .eq('id', inquilinoId)
  .select('id, nombre_completo, perfil_id')
  .single()

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('Vinculado:', data)
