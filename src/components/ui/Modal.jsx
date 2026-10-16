import { useEffect, useRef } from 'react'
import { IconX } from '../icons/Icons'
import { cn, iconTileClass } from '../../utils/ui'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

const LAYERS = {
  base: 'z-50',
  stacked: 'z-[60]',
  top: 'z-[70]',
}

/** Pila de modales abiertos: Escape cierra solo el de más arriba. */
const pilaModales = []

/**
 * Contenedor de diálogo del sistema: overlay, panel, animación, Escape y bloqueo de scroll.
 * Componer con ModalHeader / ModalBody / ModalFooter.
 */
export default function Modal({
  open,
  onClose,
  size = 'lg',
  layer = 'base',
  role = 'dialog',
  labelledBy,
  className = '',
  children,
}) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const token = {}
    pilaModales.push(token)
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (pilaModales[pilaModales.length - 1] !== token) return
      event.stopPropagation()
      onCloseRef.current?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const idx = pilaModales.indexOf(token)
      if (idx !== -1) pilaModales.splice(idx, 1)
      if (pilaModales.length === 0) document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', LAYERS[layer] ?? LAYERS.base)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-overlay-in bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => onCloseRef.current?.()}
      />
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'relative z-10 flex max-h-[calc(100dvh-2rem)] w-full animate-modal-in flex-col overflow-hidden rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/5',
          SIZES[size] ?? SIZES.lg,
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({
  title,
  titleId,
  subtitle,
  icon: Icon,
  tone = 'brand',
  media,
  onClose,
  children,
  className = '',
}) {
  return (
    <div className={cn('flex shrink-0 items-start gap-3 border-b border-slate-100 px-6 py-4', className)}>
      {media ??
        (Icon ? (
          <span className={iconTileClass(tone)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null)}
      <div className="min-w-0 flex-1 self-center">
        <h2 id={titleId} className="truncate text-base font-semibold leading-6 text-slate-900">
          {title}
        </h2>
        {subtitle ? <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div> : null}
        {children}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-2 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <IconX className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}

export function ModalBody({ className = '', children }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>
}

export function ModalFooter({ className = '', children }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5',
        className
      )}
    >
      {children}
    </div>
  )
}
