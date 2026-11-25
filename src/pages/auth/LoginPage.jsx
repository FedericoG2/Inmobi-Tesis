import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Button, { Spinner } from '../../components/ui/Button'
import LayoutAcceso from '../../components/auth/LayoutAcceso'
import { IconAlertCircle, IconCheck, IconEnvelope, IconEye, IconEyeSlash, IconLock } from '../../components/icons/Icons'
import { mensajeErrorRecuperacion, pedirEnlaceRecuperacion } from '../../services/recuperacionService'
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
  // 'login' o 'recuperar' (pedir el enlace para crear una contraseña nueva)
  const [modo, setModo] = useState('login')
  const [enlaceEnviado, setEnlaceEnviado] = useState(false)
  const [aviso, setAviso] = useState(location.state?.aviso ?? '')

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
    setAviso('')
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

  const pedirEnlace = async (e) => {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Supabase no configurado. Revisá el archivo .env')
      return
    }
    setSubmitting(true)
    const { error: errorEnvio } = await pedirEnlaceRecuperacion(email)
    setSubmitting(false)
    if (errorEnvio) {
      setError(mensajeErrorRecuperacion(errorEnvio))
      return
    }
    setEnlaceEnviado(true)
  }

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    setError('')
    setAviso('')
    setEnlaceEnviado(false)
    setPassword('')
  }

  const campoEmail = (
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
  )

  const mensajeError = error && (
    <div className={cn(calloutClass('danger'), 'flex items-start gap-2')}>
      <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </div>
  )

  if (modo === 'recuperar') {
    return (
      <LayoutAcceso>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Recuperar contraseña</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Ingresá el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
        </p>

        {enlaceEnviado ? (
          <div className="mt-8 space-y-5">
            <div className={cn(calloutClass('success'), 'flex items-start gap-2')} role="status">
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Si <strong>{email.trim()}</strong> corresponde a una cuenta, en unos minutos vas a recibir el enlace. Vence en
                una hora. Revisá también la carpeta de correo no deseado.
              </span>
            </div>
            <Button size="lg" block variant="secondary" className="h-11" onClick={() => cambiarModo('login')}>
              Volver a iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={pedirEnlace} className="mt-8 space-y-5">
            {campoEmail}
            {mensajeError}
            <Button type="submit" size="lg" block loading={submitting} className="h-11">
              {submitting ? 'Enviando…' : 'Enviar enlace'}
            </Button>
            <button
              type="button"
              onClick={() => cambiarModo('login')}
              className="block w-full text-center text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Volver a iniciar sesión
            </button>
          </form>
        )}
      </LayoutAcceso>
    )
  }

  return (
    <LayoutAcceso>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
      <p className="mt-1.5 text-sm text-slate-500">Ingresá con tus credenciales para continuar.</p>

      {!isSupabaseConfigured && (
        <div className={calloutClass('warning', 'mt-6')}>
          Falta el archivo <strong>.env</strong> con <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </div>
      )}

      {aviso && (
        <div className={cn(calloutClass('success', 'mt-6'), 'flex items-start gap-2')} role="status">
          <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {aviso}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {campoEmail}

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => cambiarModo('recuperar')}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
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

        {mensajeError}

        <Button type="submit" size="lg" block loading={submitting} className="h-11">
          {submitting ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>
    </LayoutAcceso>
  )
}
