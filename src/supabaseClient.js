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

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
