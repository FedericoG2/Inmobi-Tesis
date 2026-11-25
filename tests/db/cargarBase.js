// Arma una base Postgres embebida (PGlite) con el SQL real del repo para probar las reglas.
//
// Las migraciones anteriores a los roles (20261005) suponen tablas creadas desde el panel de
// Supabase y datos de esa época, así que de ellas se toma solo la última versión de cada función
// y trigger. Desde 20261005 los archivos se ejecutan completos: esquema_base.sql reemplaza lo que
// Supabase ya trae (auth y Storage) y la publicación de Realtime se saltea sola si no existe.
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(import.meta.dirname, '..', '..')
const MIGRACIONES = join(RAIZ, 'supabase', 'migrations')
const DESDE_ROLES = '20261005'

const leer = (archivo) => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n')

function definicionesAnteriores(archivos) {
  const funciones = new Map()
  const triggers = new Map()
  for (const archivo of archivos) {
    const sql = leer(join(MIGRACIONES, archivo))
    for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(.*?\n\$(\w*)\$;?\n/gs)) {
      funciones.set(m[1], m[0])
    }
    for (const m of sql.matchAll(/DROP FUNCTION IF EXISTS public\.(\w+)/g)) funciones.delete(m[1])
    for (const m of sql.matchAll(/CREATE TRIGGER (\w+)\s[\s\S]*?ON ([\w.]+)[\s\S]*?;/g)) {
      triggers.set(m[1], { tabla: m[2], sql: m[0] })
    }
  }
  return { funciones, triggers }
}

// Lo que estas pruebas no cargan: las vistas del dashboard vienen de migraciones anteriores.
function adaptar(archivo, sql) {
  let adaptado = sql
  if (archivo === '20261005_roles_rls_alcance.sql') {
    adaptado = adaptado.replace(/^ALTER VIEW .*$/gm, '')
  }
  if (archivo === '20261010_contratos_por_vencer_60_dias.sql') {
    adaptado = adaptado.replace(/^ALTER VIEW public\.dashboard_admin_kpis RENAME[^;]*;$/m, '')
  }
  return adaptado
}

export async function crearBase() {
  const db = new PGlite()
  await db.exec(leer(join(import.meta.dirname, 'esquema_base.sql')))

  const archivos = readdirSync(MIGRACIONES)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort()
  const anteriores = archivos.filter((f) => f < DESDE_ROLES)
  const desdeRoles = archivos.filter((f) => f >= DESDE_ROLES)

  const { funciones, triggers } = definicionesAnteriores(anteriores)
  for (const [nombre, sql] of funciones) {
    try {
      await db.exec(sql)
    } catch (error) {
      // Funciones de módulos que ya no existen (garantes, tabla indices): no hacen falta.
      if (!/does not exist/.test(error.message)) throw new Error(`${nombre}: ${error.message}`)
    }
  }
  for (const [nombre, { tabla, sql }] of triggers) {
    try {
      await db.exec(`DROP TRIGGER IF EXISTS ${nombre} ON ${tabla};\n${sql}`)
    } catch (error) {
      if (!/does not exist/.test(error.message)) throw new Error(`${nombre}: ${error.message}`)
    }
  }
  for (const archivo of desdeRoles) {
    try {
      await db.exec(adaptar(archivo, leer(join(MIGRACIONES, archivo))))
    } catch (error) {
      throw new Error(`${archivo}: ${error.message}`)
    }
  }

  // En Supabase el alta de usuarios llama a handle_new_user desde auth.users.
  await db.exec(
    'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();'
  )

  // La fecha de "hoy" se puede fijar con prueba.hoy para probar los plazos del 11 al 10.
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.fecha_hoy_ar() RETURNS date LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('prueba.hoy', true), '')::date,
                      (now() AT TIME ZONE 'America/Argentina/Cordoba')::date)
    $$;
  `)

  return db
}

/** Ejecuta `fn` como el usuario indicado (rol authenticated de Supabase, con RLS). */
export async function comoUsuario(db, uid, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('prueba.uid', $1, true)`, [uid])
    await tx.exec('SET LOCAL ROLE authenticated')
    return fn(tx)
  })
}

export async function fijarHoy(db, fecha) {
  await db.query(`SELECT set_config('prueba.hoy', $1, false)`, [fecha ?? ''])
}
