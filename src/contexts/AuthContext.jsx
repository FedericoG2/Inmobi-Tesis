import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

/*
 * Sesión y rol del usuario para toda la aplicación.
 *
 * 1. Supabase Auth guarda la sesión en el navegador; al iniciar, onAuthStateChange avisa si hay una.
 * 2. Con la sesión, se lee el rol en public.perfiles ('admin', 'encargado', 'inquilino' o 'propietario').
 * 3. Los guards (src/guards) usan useAuth() para dejar pasar o redirigir a la pantalla de cada rol.
 *    Sin perfil o sin rol, la cuenta no entra (RF-005).
 */
const AuthContext = createContext(null)

async function obtenerRol(userId) {
  if (!supabase) return null

  const { data, error } = await supabase.from('perfiles').select('rol').eq('id', userId).maybeSingle()

  if (error) {
    console.error('[Inmobi] No se pudo obtener el rol:', error.message)
    return null
  }

  return data?.rol ?? null
}

// Pantalla de inicio de cada rol: administración de cuentas, panel de la inmobiliaria o portales.
const RUTA_INICIO = {
  admin: '/cuentas',
  encargado: '/admin/dashboard',
  inquilino: '/inquilino/dashboard',
  propietario: '/propietario/inicio',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [rol, setRol] = useState(null)
  // Solo es true mientras se resuelve la sesión al abrir la aplicación.
  const [initializing, setInitializing] = useState(Boolean(supabase))
  // true mientras se lee el rol después de iniciar sesión.
  const [rolLoading, setRolLoading] = useState(false)
  const userIdRef = useRef(null)

  useEffect(() => {
    if (!supabase) return undefined

    let mounted = true
    const terminarInicio = () => {
      if (mounted) setInitializing(false)
    }
    // Si Supabase no responde, la aplicación no queda trabada en "Cargando".
    const limiteInicio = setTimeout(terminarInicio, 8000)

    const aplicarSesion = async (session) => {
      if (!mounted) return

      if (session?.user) {
        userIdRef.current = session.user.id
        setUser(session.user)
        setRolLoading(true)
        const rolPerfil = await obtenerRol(session.user.id)
        if (mounted) {
          setRol(rolPerfil)
          setRolLoading(false)
        }
      } else {
        userIdRef.current = null
        setUser(null)
        setRol(null)
        setRolLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Fuera del callback de Supabase: hacer consultas dentro de él puede bloquear la sesión.
      setTimeout(async () => {
        if (!mounted) return

        // Al volver a la pestaña Supabase renueva el token: no hace falta recargar nada.
        if (event === 'TOKEN_REFRESHED') return

        // La misma sesión ya está cargada: se ignora el evento repetido al cambiar de pestaña.
        if (event === 'SIGNED_IN' && userIdRef.current !== null && session?.user?.id === userIdRef.current) {
          return
        }

        try {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            await aplicarSesion(session)
          }
        } catch (error) {
          console.error('[Inmobi] Error al verificar la sesión:', error)
        } finally {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
            clearTimeout(limiteInicio)
            terminarInicio()
          }
        }
      }, 0)
    })

    return () => {
      mounted = false
      clearTimeout(limiteInicio)
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    rol,
    initializing,
    rolLoading,
    loading: initializing,
    isAuthenticated: user !== null,
    isAdminSistema: rol === 'admin', // Administrador de sistema: solo administra cuentas
    isEncargado: rol === 'encargado', // Encargado de Alquileres: opera la cartera
    isInquilino: rol === 'inquilino',
    isPropietario: rol === 'propietario',
    rutaInicio: RUTA_INICIO[rol] ?? null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
