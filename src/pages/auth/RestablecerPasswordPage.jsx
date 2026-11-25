import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutAcceso from '../../components/auth/LayoutAcceso'
import Button, { Spinner } from '../../components/ui/Button'
import { IconAlertCircle, IconEye, IconEyeSlash, IconLock } from '../../components/icons/Icons'
import { enlaceRecuperacion, supabase } from '../../supabaseClient'
import {
  MIN_PASSWORD,
  guardarNuevaPassword,
  mensajeErrorRecuperacion,
  validarNuevaPassword,
} from '../../services/recuperacionService'
import { calloutClass, cn, inputClass, labelClass } from '../../utils/ui'

function estadoInicial() {
  if (!supabase) return 'invalido'
  if (enlaceRecuperacion.error) return 'invalido'
  return enlaceRecuperacion.esRecuperacion ? 'verificando' : 'invalido'
}

function CampoPassword({ id, label, value, onChange, visible, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, 'h-11 pl-10')}
        />
      </div>
    </div>
  )
}

/**
 * Pantalla a la que lleva el enlace del email de recuperación. Supabase abre una sesión temporal
 * con ese enlace; con ella se guarda la contraseña nueva y después se cierra la sesión.
 * Solo funciona si se llega desde el enlace: una sesión común no puede cambiar la contraseña acá.
 */
export default function RestablecerPasswordPage() {
  const navigate = useNavigate()
  // verificando · listo · invalido
  const [estado, setEstado] = useState(estadoInicial)
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (estado !== 'verificando') return undefined
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN'))) {
        setEstado('listo')
      } else if (event === 'INITIAL_SESSION') {
        setEstado('invalido')
      }
    })
    return () => subscription.unsubscribe()
  }, [estado])

  const guardar = async (e) => {
    e.preventDefault()
    const invalida = validarNuevaPassword(password, repetida)
    if (invalida) {
      setError(invalida)
      return
    }
    setError('')
    setGuardando(true)
    const { error: errorGuardar } = await guardarNuevaPassword(password)
    setGuardando(false)
    if (errorGuardar) {
      setError(mensajeErrorRecuperacion(errorGuardar))
      return
    }
    navigate('/login', {
      replace: true,
      state: { aviso: 'Tu contraseña se actualizó. Ya podés iniciar sesión con la nueva.' },
    })
  }

  if (estado === 'verificando') {
    return (
      <LayoutAcceso>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Verificando el enlace…
        </p>
      </LayoutAcceso>
    )
  }

  if (estado === 'invalido') {
    return (
      <LayoutAcceso>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Enlace no válido</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          El enlace para crear una contraseña nueva venció o ya se usó. Los enlaces valen una sola vez y durante una hora.
        </p>
        <Button size="lg" block className="mt-8 h-11" onClick={() => navigate('/login', { replace: true })}>
          Volver a iniciar sesión
        </Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Desde ahí, en “¿Olvidaste tu contraseña?”, podés pedir un enlace nuevo.
        </p>
      </LayoutAcceso>
    )
  }

  return (
    <LayoutAcceso>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Nueva contraseña</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Elegí una contraseña de al menos {MIN_PASSWORD} caracteres. Después vas a ingresar con ella.
      </p>

      <form onSubmit={guardar} className="mt-8 space-y-5">
        <CampoPassword id="password-nueva" label="Contraseña nueva" value={password} onChange={setPassword} visible={visible} autoFocus />
        <CampoPassword id="password-repetida" label="Repetir contraseña" value={repetida} onChange={setRepetida} visible={visible} />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {visible ? <IconEyeSlash className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
          {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>

        {error && (
          <div className={cn(calloutClass('danger'), 'flex items-start gap-2')}>
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={guardando} className="h-11">
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </LayoutAcceso>
  )
}
