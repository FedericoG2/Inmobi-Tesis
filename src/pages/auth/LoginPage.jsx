import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import InmobiLogoMark from '../../components/brand/InmobiLogoMark'
import Button, { Spinner } from '../../components/ui/Button'
import {
  IconAlertCircle,
  IconClipboard,
  IconEnvelope,
  IconEye,
  IconEyeSlash,
  IconLock,
  IconTrendingUp,
  IconWrench,
} from '../../components/icons/Icons'
import { brandLogoMdClass } from '../../utils/brandUi'
import { calloutClass, cn, inputClass, labelClass, surfaceCard } from '../../utils/ui'

const PILARES = [
  { icon: IconClipboard, titulo: 'Contratos', texto: 'Vigencias, documentos y ciclo de vida.' },
  { icon: IconTrendingUp, titulo: 'Aumentos', texto: 'Cálculo por IPC e ICL con índices oficiales.' },
  { icon: IconWrench, titulo: 'Reclamos', texto: 'Seguimiento de cada pedido de mantenimiento.' },
]

function PanelMarca() {
  return (
    <div className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
          <InmobiLogoMark className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-white">Inmobi</span>
      </div>

      <div className="relative z-10 max-w-md">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
          Gestión inmobiliaria, en un solo lugar.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-brand-100">
          Propiedades, contratos, aumentos y reclamos centralizados para la administración y sus inquilinos.
        </p>

        <ul className="mt-10 space-y-4">
          {PILARES.map(({ icon: Icon, titulo, texto }) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-inset ring-white/15">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{titulo}</p>
                <p className="text-sm text-brand-200">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-brand-200/80">© 2026 Zitelli &amp; Asociados</p>
    </div>
  )
}

function PantallaCentrada({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">{children}</div>
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
      <PantallaCentrada>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Verificando perfil…
        </p>
      </PantallaCentrada>
    )
  }

  if (!initializing && !rolLoading && isAuthenticated) {
    if (isAdmin) return <Navigate to={from?.startsWith('/admin') ? from : '/admin/dashboard'} replace />
    if (isInquilino) return <Navigate to={from?.startsWith('/inquilino') ? from : '/inquilino/dashboard'} replace />

    return (
      <PantallaCentrada>
        <div className={`${surfaceCard} w-full max-w-md p-8 text-center`}>
          <h2 className="text-base font-semibold text-slate-900">Cuenta sin rol asignado</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Tu usuario existe en Supabase Auth pero no tiene fila en <code>perfiles</code> con rol{' '}
            <code>admin</code> o <code>inquilino</code>.
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
      setError(authError.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen bg-white">
      <PanelMarca />

      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-[54%]">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className={brandLogoMdClass}>
              <InmobiLogoMark className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Inmobi</span>
          </div>

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

          <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">© 2026 Zitelli &amp; Asociados</p>
        </div>
      </div>
    </div>
  )
}
