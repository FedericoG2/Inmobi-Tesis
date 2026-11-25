import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { MotionConfig, motion as Motion } from 'motion/react'
import { isSupabaseConfigured, supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Button, { Spinner } from '../../components/ui/Button'
import PanelMarcaLogin from '../../components/auth/PanelMarcaLogin'
import { IconAlertCircle, IconEnvelope, IconEye, IconEyeSlash, IconLock } from '../../components/icons/Icons'
import { calloutClass, cn, inputClass, labelClass, surfaceCard } from '../../utils/ui'

function mensajeErrorLogin(error) {
  const texto = String(error?.message ?? '').toLowerCase()
  if (texto.includes('banned')) {
    return 'Tu cuenta está bloqueada. Consultá con el Administrador de sistema.'
  }
  if (texto.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (texto.includes('email not confirmed')) {
    return 'La cuenta todavía no está confirmada.'
  }
  return 'No se pudo iniciar sesión. Intentá de nuevo.'
}

function PantallaCentrada({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">{children}</div>
}

export default function LoginPage() {
  const { isAuthenticated, rutaInicio, initializing, rolLoading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname

  if ((initializing || rolLoading) && isAuthenticated) {
    return (
      <PantallaCentrada>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Verificando perfil…
        </p>
      </PantallaCentrada>
    )
  }

  if (!initializing && !rolLoading && isAuthenticated) {
    if (rutaInicio) {
      const prefijo = `/${rutaInicio.split('/')[1]}`
      return <Navigate to={from?.startsWith(prefijo) ? from : rutaInicio} replace />
    }

    return (
      <PantallaCentrada>
        <div className={`${surfaceCard} w-full max-w-md p-8 text-center`}>
          <h2 className="text-base font-semibold text-slate-900">Cuenta sin rol asignado</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Tu cuenta no tiene un rol asignado. Pedile al Administrador de sistema que te asigne uno.
          </p>
          <Button onClick={() => supabase?.auth.signOut()} className="mt-6">
            Cerrar sesión
          </Button>
        </div>
      </PantallaCentrada>
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
      setError(mensajeErrorLogin(authError))
    }
    setSubmitting(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-white">
        <PanelMarcaLogin />

        <div className="relative flex w-full items-center justify-center overflow-hidden px-6 py-12 lg:w-[54%]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-slate-300)_1px,transparent_1px)] [background-size:20px_20px] opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]"
            aria-hidden
          />
          <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm"
          >
            <p className="mb-10 text-xl font-semibold tracking-tight text-slate-900 lg:hidden">Inmobi</p>

            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="mt-1.5 text-sm text-slate-500">Ingresá con tus credenciales para continuar.</p>

            {!isSupabaseConfigured && (
              <div className={calloutClass('warning', 'mt-6')}>
                Falta el archivo <strong>.env</strong> con <code>VITE_SUPABASE_URL</code> y{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <div className="relative">
                  <IconEnvelope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(inputClass, 'h-11 pl-10')}
                    placeholder="nombre@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Contraseña
                </label>
                <div className="relative">
                  <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={verPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(inputClass, 'h-11 pl-10 pr-11')}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {verPassword ? <IconEyeSlash className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className={cn(calloutClass('danger'), 'flex items-start gap-2')}>
                  <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" block loading={submitting} className="h-11">
                {submitting ? 'Ingresando…' : 'Iniciar sesión'}
              </Button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-1.5 font-mono text-[11px] text-slate-400">
              <IconLock className="h-3 w-3" />
              Conexión cifrada
            </p>

            <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">© 2026 Zitelli &amp; Asociados</p>
          </Motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}
