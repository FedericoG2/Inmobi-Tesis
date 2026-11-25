import { MotionConfig, motion as Motion } from 'motion/react'
import PanelMarcaLogin from './PanelMarcaLogin'
import { IconLock } from '../icons/Icons'

/** Marco de las pantallas de acceso (inicio de sesión y nueva contraseña): panel de marca y formulario. */
export default function LayoutAcceso({ children }) {
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

            {children}

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
