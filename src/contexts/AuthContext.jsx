import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

// ==========================================
// PASO 1: CREAR EL CANAL DE AUTENTICACIÓN
// ==========================================
// Creamos el canal de datos para que la sesión de Inmobi viaje por la app.
const AuthContext = createContext(null)

// ==========================================
// PASO 4 (MOMENTO B): CONSULTA A LA BASE DE DATOS
// ==========================================
// Esta función va a internet, entra a la tabla 'perfiles' de Supabase
// y trae el rol ('admin' o 'inquilino') usando el ID del usuario.
async function fetchRol(userId) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[Inmobi] Error al obtener el rol de la base de datos:', error.message)
    return null
  }

  return data?.rol ?? null
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export function AuthProvider({ children }) {
  // ==========================================
  // PASO 2: LOS TRES ESTADOS INICIALES
  // ==========================================
  // Guardan los datos en la memoria mientras la app esté abierta.
  const [user, setUser] = useState(null) // Guarda el email y el ID de Supabase
  const [rol, setRol] = useState(null) // Guarda si es 'admin' o 'inquilino'
  const [initializing, setInitializing] = useState(true) // Solo true al primer arranque de la app
  const [rolLoading, setRolLoading] = useState(false) // true solo mientras trae el rol post-login
  const userIdRef = useRef(null)

  // ==========================================
  // PASO 4: LA VERIFICACIÓN REAL CON SUPABASE
  // ==========================================
  useEffect(() => {
    if (!supabase) {
      setInitializing(false)
      return
    }

    let mounted = true

    const finishInitializing = () => {
      if (mounted) setInitializing(false)
    }

    const loadingTimeout = setTimeout(finishInitializing, 8000)

    const applySession = async (session) => {
      if (!mounted) return

      if (session?.user) {
        userIdRef.current = session.user.id
        setUser(session.user)
        setRolLoading(true)
        const perfilRol = await fetchRol(session.user.id)
        if (mounted) {
          setRol(perfilRol)
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
      setTimeout(async () => {
        if (!mounted) return

        // Al volver a la pestaña Supabase refresca el token — no hay que re-cargar la app
        if (event === 'TOKEN_REFRESHED') return

        // Sesión ya cargada: ignorar eventos duplicados al cambiar de pestaña
        if (
          event === 'SIGNED_IN' &&
          session?.user?.id === userIdRef.current &&
          userIdRef.current !== null
        ) {
          return
        }

        try {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            await applySession(session)
          }
        } catch (error) {
          console.error('[Inmobi] Error en la verificación:', error)
        } finally {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
            clearTimeout(loadingTimeout)
            finishInitializing()
          }
        }
      }, 0)
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  // ==========================================
  // PASO 3: CREAR EL PAQUETE Y COMPARTIRLO
  // ==========================================

  // 3-A: Armamos el objeto 'value' con respuestas lógicas de Sí o No (booleanos)
  const value = {
    user,
    rol,
    initializing,
    rolLoading,
    loading: initializing, // alias: solo bloquea en el primer arranque
    isAuthenticated: user !== null, // true si el usuario logueó
    isAdmin: rol === 'admin', // true si es administrador de la inmobiliaria
    isInquilino: rol === 'inquilino', // true si es cliente/inquilino
  }

  // 3-B: Metemos el paquete en el canal (.Provider) y envolvemos al Router ({children})
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ==========================================
// PASO 5: EL ATRAJO (HOOK) PARA LAS RUTAS Y PANTALLAS
// ==========================================
// Cualquier archivo de Inmobi llama a esta función para leer el paquete 'value'.
export function useAuth() {
  return useContext(AuthContext)
}



// =========================================================================
// 📝 MINI RESUMEN PARA EL EL FUTURO (LEER DE CORRIDO EN ESTE ORDEN):
// =========================================================================
/*
PASO 1: CREAR EL CANAL VACÍO (createContext)
- El problema en React es que pasar datos de un archivo a otro es un viaje total. Las variables 
  acá adentro y en cada archivo por defecto son privadas. Por eso creamos un canal central vacío para Inmobi, este canal vacio se va a llenar de info como por ejemplo si hay una sesion iniciada o no, que usuario esta logueado, etc y luego este canal se va a compartir con cualquier componente que lo necesite como por ejemplo el Router, va a poder acceder a la info de este canal mediante una funcion llamada useAuth(). EL Router con esa info puede decidir si mostrar un componente o otro, si mostrar un boton o no, etc.

PASO 2: CONGELAR LA APP AL ARRANCAR (useState)
- Creamos la memoria del archivo (user, rol) es decir aun no hay usario ni rol pero si el loading esta en true, la app se congela y no se muestra nada hasta que el loading sea false. Esto se debe a que el ruter pregunta sobre el loading y si esta en true, muestra el cartel de carga.

PASO 3: MANDAR EL PAQUETE AL CANAL (value y .Provider)
- Juntamos los estados en un paquete cómodo lleno de atajos de Sí/No (como 'isAdmin').
- ¿Cómo ponemos ese paquete 'value' dentro del canal? Lo metemos en la propiedad 'value' del (.Provider).
- Al envolver a los '{children}', hacemos que esos datos dejen de ser privados y pasen a ser 
  pÚblicos para el Router que está metido ahí adentro. Como la carga es 'true', el Router ve 
  esto y muestra la pantalla de "Cargando Inmobi...".




PASO 4: LA VERIFICACIÓN REAL CON SUPABASE (useEffect)
- Mientras el usuario ve el cartel de carga, este bloque se despierta y hace el laburo:
  A) React consulta con supabase que este le pregunta al navegador (LocalStorage) si hay un token de sesión guardado.
  B) Si hay, guarda el usuario (user) y viaja a internet a la tabla 'perfiles' de Supabase 
     a buscar el rol ('admin' o 'inquilino').
  C) Cuando vuelve con el rol, cambia 'loading' a 'false'. Si no había nadie, también lo pasa a 'false'.

PASO 5: LA LIBERACIÓN Y EL ENCHUFE (useAuth)
- Como en el Paso 4 cambiamos los estados, este archivo se vuelve a ejecutar automáticamente, 
  pero ahora el paquete 'value' viaja con loading en 'false', isAuthenticated en true y el rol real.
- El Router recibe esta actualización del canal, saca el cartel de carga y te dibuja el Dashboard 
  si sos admin de la inmobiliaria, o el Login si no estabas conectado.
- Creamos la función 'useAuth()' como un "enchufe" para que mañana, cualquier otra ruta o pantalla 
  del sistema llame a esa función en una sola línea y sepa qué mostrar u ocultar según el rol.
*/