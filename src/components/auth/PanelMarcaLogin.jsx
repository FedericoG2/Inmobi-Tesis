import { useEffect, useState } from 'react'
import { AnimatePresence, animate, motion as Motion, useMotionTemplate, useMotionValue, useTransform } from 'motion/react'
import GrillaTitilante from './GrillaTitilante'
import {
  IconCheckCircle,
  IconClipboardCheck,
  IconDocument,
  IconTrendingUp,
  IconUser,
  IconWrench,
} from '../icons/Icons'

/*
 * Panel izquierdo del login. En vez de una lista de funciones muestra el producto funcionando:
 * el registro de actividad en vivo y un aumento por ICL calculándose. Los datos son ilustrativos.
 */

const EASE = [0.16, 1, 0.3, 1]

const TONOS = {
  ok: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  atencion: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  marca: 'bg-brand-300/10 text-brand-200 ring-brand-300/20',
  neutro: 'bg-white/5 text-slate-300 ring-white/10',
}

const EVENTOS = [
  { icon: IconClipboardCheck, tono: 'ok', titulo: 'Contrato creado', detalle: 'Av. Corrientes 1234, 4° B · pasó a Alquilada' },
  { icon: IconWrench, tono: 'atencion', titulo: 'Reclamo #128 en proceso', detalle: 'Pérdida de agua · Gorriti 5120, 2° A' },
  { icon: IconTrendingUp, tono: 'marca', titulo: 'Aumento ICL confirmado', detalle: 'Thames 845, PB · rige desde el 1/11' },
  { icon: IconDocument, tono: 'neutro', titulo: 'Documento adjuntado', detalle: 'Contrato firmado · Av. Cabildo 2280, 7° C' },
  { icon: IconCheckCircle, tono: 'ok', titulo: 'Reclamo #124 resuelto', detalle: 'Cambio de cerradura · Billinghurst 980' },
  { icon: IconUser, tono: 'marca', titulo: 'Inquilino vinculado al portal', detalle: 'Mariana López · acceso habilitado' },
]

// Variación mensual acumulada de un índice, normalizada para la curva.
const SERIE = [100, 103.1, 106.9, 109.8, 113.6, 116.2, 120.4, 124.9, 128.3, 133.0, 137.4, 142.1]

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function hace(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 5) return 'ahora'
  if (s < 60) return `hace ${s} s`
  return `hace ${Math.floor(s / 60)} min`
}

function PuntoEnVivo({ className = 'bg-emerald-400' }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${className}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  )
}

function ActividadEnVivo() {
  const [cola, setCola] = useState(() => {
    const t = Date.now()
    return {
      siguiente: 3,
      items: EVENTOS.slice(0, 3).map((e, i) => ({ ...e, id: i, en: t - [9, 140, 380][i] * 1000 })),
    }
  })
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    let segundos = 0
    const id = setInterval(() => {
      const t = Date.now()
      segundos += 1
      setAhora(t)
      if (segundos % 4 !== 0) return
      setCola(({ siguiente, items }) => ({
        siguiente: siguiente + 1,
        items: [{ ...EVENTOS[siguiente % EVENTOS.length], id: siguiente, en: t }, ...items].slice(0, 4),
      }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.04] shadow-[0_32px_64px_-24px_rgb(0_0_0/0.6)] ring-1 ring-inset ring-white/10 backdrop-blur-md">
      {/* Línea de luz que recorre el borde superior. */}
      <Motion.span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        aria-hidden
      />

      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <p className="text-[13px] font-medium text-white">Actividad reciente</p>
        <span className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300">
          <PuntoEnVivo />
          En vivo
        </span>
      </div>

      <ul
        className="relative h-[12.5rem] overflow-hidden px-2 py-2"
        style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent)' }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {cola.items.map(({ id, icon: Icon, tono, titulo, detalle, en }) => (
            <Motion.li
              key={id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.55, ease: EASE }}
              className="flex items-start gap-3 rounded-xl px-2 py-2.5"
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONOS[tono]}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{titulo}</span>
                <span className="block truncate text-xs text-brand-200/80">{detalle}</span>
              </span>
              <span className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-brand-200/60">
                {hace(ahora - en)}
              </span>
            </Motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function Curva() {
  const ancho = 220
  const alto = 48
  const min = SERIE[0]
  const max = SERIE[SERIE.length - 1]
  const puntos = SERIE.map((v, i) => [(i / (SERIE.length - 1)) * ancho, alto - ((v - min) / (max - min)) * (alto - 6) - 3])
  const linea = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-12 w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="login-curva" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-300)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-brand-300)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Motion.path
        d={`${linea} L${ancho},${alto} L0,${alto} Z`}
        fill="url(#login-curva)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      />
      <Motion.path
        d={linea}
        fill="none"
        stroke="var(--color-brand-200)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.8, duration: 1.6, ease: EASE }}
      />
      <Motion.circle
        cx={puntos[puntos.length - 1][0]}
        cy={puntos[puntos.length - 1][1]}
        r="3"
        fill="var(--color-brand-100)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2.3, type: 'spring', stiffness: 400, damping: 18 }}
      />
    </svg>
  )
}

function AumentoCalculandose() {
  const desde = 420000
  const hasta = 498960
  const monto = useMotionValue(desde)
  const texto = useTransform(monto, (v) => pesos.format(Math.round(v)))
  const porcentaje = useTransform(monto, (v) => `+${(((v - desde) / desde) * 100).toFixed(1).replace('.', ',')} %`)

  useEffect(() => {
    const control = animate(monto, hasta, { delay: 0.8, duration: 1.8, ease: EASE })
    return () => control.stop()
  }, [monto])

  return (
    <Motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { delay: 0.5, duration: 0.6 },
        y: { delay: 1.2, duration: 6, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="relative z-10 -mt-12 ml-auto mr-0 w-[17.5rem] rounded-2xl bg-brand-800/90 p-4 shadow-[0_32px_64px_-20px_rgb(0_0_0/0.7)] ring-1 ring-inset ring-white/10 backdrop-blur-md xl:-mr-8"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-brand-200/70">Próximo aumento · ICL</p>
        <span className="rounded-full bg-brand-300/10 px-2 py-0.5 text-[10px] font-medium text-brand-100 ring-1 ring-inset ring-brand-300/20">
          Programado
        </span>
      </div>
      <p className="mt-1 text-xs text-brand-200/80">Thames 845, PB · 1/11</p>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <Motion.span className="font-mono text-xl font-medium tabular-nums tracking-tight text-white">{texto}</Motion.span>
        <Motion.span className="font-mono text-xs tabular-nums text-emerald-300">{porcentaje}</Motion.span>
      </div>
      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-brand-200/50 line-through">{pesos.format(desde)}</p>
      <div className="mt-3">
        <Curva />
      </div>
    </Motion.div>
  )
}

export default function PanelMarcaLogin() {
  const mx = useMotionValue(-400)
  const my = useMotionValue(-400)
  const foco = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgb(122 148 217 / 0.16), transparent 70%)`

  const seguirPuntero = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - r.left)
    my.set(e.clientY - r.top)
  }

  return (
    <div
      onPointerMove={seguirPuntero}
      className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:gap-8 lg:p-12 xl:p-14"
    >
      <GrillaTitilante
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_70%_55%,black_15%,transparent_70%)]"
      />
      <Motion.div className="pointer-events-none absolute inset-0" style={{ background: foco }} aria-hidden />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />

      <p className="relative z-10 text-xl font-semibold tracking-tight text-white">Inmobi</p>

      <div className="relative z-10">
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="max-w-md"
        >
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand-200">
            Gestión de alquileres
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight text-white xl:text-[2.5rem]">
            Cada cambio, registrado y a la vista.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-200 [@media(max-height:840px)]:hidden">
            Gestiona el ciclo completo del alquiler: alta y cierre de contratos, cobro mensual con comprobantes y
            confirmación de pagos, actualización de montos por IPC e ICL y seguimiento de reclamos. Cada operación queda
            registrada con su usuario, fecha y estado resultante.
          </p>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: EASE }}
          className="mt-8 max-w-md"
        >
          <ActividadEnVivo />
          <AumentoCalculandose />
        </Motion.div>
      </div>

      <p className="relative z-10 font-mono text-[11px] text-brand-200/60">© 2026 Zitelli &amp; Asociados</p>
    </div>
  )
}
