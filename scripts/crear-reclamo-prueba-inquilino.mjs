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

const { error: loginError } = await sb.auth.signInWithPassword({ email, password })
if (loginError) {
  console.error('Login falló:', loginError.message)
  process.exit(1)
}

const { data: inquilino, error: inqError } = await sb
  .from('inquilinos')
  .select('id, nombre_completo')
  .eq('perfil_id', (await sb.auth.getUser()).data.user.id)
  .single()

if (inqError || !inquilino) {
  console.error('Inquilino no encontrado:', inqError?.message)
  process.exit(1)
}

const { data: contrato, error: cError } = await sb
  .from('contratos')
  .select('id, propiedad_id, propiedades(direccion)')
  .eq('inquilino_id', inquilino.id)
  .eq('activo', true)
  .limit(1)
  .maybeSingle()

if (cError || !contrato) {
  console.error('Sin contrato activo:', cError?.message)
  process.exit(1)
}

const payload = {
  inquilino_id: inquilino.id,
  propiedad_id: contrato.propiedad_id,
  titulo: 'Reclamo de prueba — portal inquilino',
  descripcion:
    'Reclamo demo cargado desde el portal del inquilino para verificar sincronización con admin.',
  categoria: 'Plomeria',
  prioridad: 'Urgente',
  estado: 'Pendiente',
}

const { data, error } = await sb.from('reclamos').insert(payload).select('id,titulo,prioridad,estado,fecha_creacion').single()

if (error) {
  console.error('Error al crear reclamo:', error.message)
  process.exit(1)
}

console.log('Reclamo creado como', inquilino.nombre_completo)
console.log('Propiedad:', contrato.propiedades?.direccion)
console.log(JSON.stringify(data, null, 2))
