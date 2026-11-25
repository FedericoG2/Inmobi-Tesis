// Este archivo es el que se encarga de la conexión con la base de datos de Supabase. supabase se usa en cada peticion que se haga a la base de datos y dentro de el viaja la autenticacion y las credenciales de la app.

import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Corrige URLs copiadas por error desde el REST endpoint
const supabaseUrl = rawUrl?.replace(/\/rest\/v1\/?$/, '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[Inmobi] Creá un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY'
  )
}

/**
 * Datos del enlace de recuperación de contraseña. Se leen antes de crear el cliente porque el
 * cliente procesa la URL al iniciar y la limpia. El enlace llega como `#access_token=…&type=recovery`
 * o, si venció o ya se usó, con `error_description`.
 */
function leerEnlaceRecuperacion() {
  if (typeof window === 'undefined') return { esRecuperacion: false, error: null }
  const datos = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`)
  return {
    esRecuperacion: datos.get('type') === 'recovery',
    error: datos.get('error_description') ?? datos.get('error'),
  }
}

export const enlaceRecuperacion = leerEnlaceRecuperacion()

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
