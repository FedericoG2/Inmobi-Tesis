import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { isAuthenticated, isAdmin, isInquilino, initializing, rolLoading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname

  if ((initializing || rolLoading) && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-900">
        <p className="text-sm text-white/90">Verificando perfil...</p>
      </div>
    )
  }

  if (!initializing && !rolLoading && isAuthenticated) {
    if (isAdmin) return <Navigate to={from?.startsWith('/admin') ? from : '/admin/dashboard'} replace />
    if (isInquilino) return <Navigate to={from?.startsWith('/inquilino') ? from : '/inquilino/dashboard'} replace />

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-900 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-700">Inmobi</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión inmobiliaria</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Falta el archivo <strong>.env</strong> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
