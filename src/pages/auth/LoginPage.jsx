import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

function IconEdificio({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  )
}

function IconSobre({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  )
}

function IconCandado({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  )
}

function IconOjo({ abierto, className }) {
  if (abierto) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  )
}

function PanelMarca() {
  return (
    <div className="relative hidden overflow-hidden bg-indigo-700 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      {/* Líneas decorativas de fondo */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.06]"
        fill="none"
        aria-hidden
      >
        <defs>
          <pattern id="grid-login" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0v48" stroke="currentColor" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-login)" />
      </svg>

      {/* Silueta de edificios */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full text-white/[0.08]"
        viewBox="0 0 600 160"
        fill="currentColor"
        aria-hidden
      >
        <path d="M0 160V90h45v70zM55 160V40h60v120zM125 160V70h40v90zM175 160V20h70v140zM255 160V60h50v100zM315 160V35h65v125zM390 160V80h45v80zM445 160V50h60v110zM515 160V95h40v65zM565 160V65h35v95z" />
      </svg>

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
          <IconEdificio className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Inmobi</span>
      </div>

      <div className="relative z-10">
        <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
          Hola! <span className="inline-block">👋</span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-indigo-100">
          Gestioná propiedades, contratos, aumentos y reclamos desde un solo lugar.
        </p>
      </div>

      <p className="relative z-10 text-xs text-indigo-200/80">
        © 2026 Zitelli &amp; Asociados
      </p>
    </div>
  )
}

export default function LoginPage() {
  const { isAuthenticated, isAdmin, isInquilino, initializing, rolLoading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname

  if ((initializing || rolLoading) && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-700">
        <p className="text-sm text-white/90">Verificando perfil...</p>
      </div>
    )
  }

  if (!initializing && !rolLoading && isAuthenticated) {
    if (isAdmin) return <Navigate to={from?.startsWith('/admin') ? from : '/admin/dashboard'} replace />
    if (isInquilino) return <Navigate to={from?.startsWith('/inquilino') ? from : '/inquilino/dashboard'} replace />

    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-700 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-slate-800">Cuenta sin rol asignado</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tu usuario existe en Supabase Auth pero no tiene fila en <code>perfiles</code> con rol{' '}
            <code>admin</code> o <code>inquilino</code>.
          </p>
          <button
            type="button"
            onClick={() => supabase?.auth.signOut()}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (!supabase) {
      setError('Supabase no configurado. Revisá el archivo .env')
      setSubmitting(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen bg-white">
      <PanelMarca />

      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo (visible siempre; en desktop refuerza la marca del panel) */}
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <IconEdificio className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Inmobi</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">¡Bienvenido de nuevo!</h2>
          <p className="mt-1.5 text-sm text-slate-500">Ingresá con tu cuenta para continuar</p>

          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Falta el archivo <strong>.env</strong> con <code>VITE_SUPABASE_URL</code> y{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <IconSobre className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <IconCandado className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-11 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
                >
                  <IconOjo abierto={!verPassword} className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {submitting ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">
            © 2026 Zitelli &amp; Asociados
          </p>
        </div>
      </div>
    </div>
  )
}
