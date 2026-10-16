import { IconAlert, IconCheckCircle, IconInfo, IconX, IconXCircle } from '../icons/Icons'
import { cn } from '../../utils/ui'

const TONOS = {
  success: { icon: IconCheckCircle, color: 'text-emerald-600', barra: 'bg-emerald-500' },
  info: { icon: IconInfo, color: 'text-brand-600', barra: 'bg-brand-500' },
  warning: { icon: IconAlert, color: 'text-amber-600', barra: 'bg-amber-500' },
  error: { icon: IconXCircle, color: 'text-red-600', barra: 'bg-red-500' },
}

/** Pila de avisos abajo a la derecha (arriba del menú inferior en el portal móvil). */
export default function ToastViewport({ toasts, onCerrar }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end lg:bottom-6"
    >
      {toasts.map((t) => {
        const tono = TONOS[t.tono] ?? TONOS.info
        const Icon = tono.icon
        return (
          <div
            key={t.id}
            role={t.tono === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto relative flex w-full max-w-sm animate-modal-in items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-3 shadow-pop"
          >
            <span className={cn('absolute inset-y-0 left-0 w-1', tono.barra)} aria-hidden />
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tono.color)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{t.titulo}</p>
              {t.detalle ? <p className="mt-0.5 text-sm leading-snug text-slate-600">{t.detalle}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onCerrar(t.id)}
              aria-label="Cerrar aviso"
              className="-mr-1 -mt-0.5 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <IconX className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
