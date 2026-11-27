import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn, surfacePopover } from '../../utils/ui'

const MARGEN = 8

/**
 * Tooltip con contenido enriquecido. Se abre al pasar el mouse, al enfocar el disparador con el
 * teclado o al tocarlo, y queda abierto mientras el puntero está sobre el globo (para leer el
 * cálculo completo). Escape lo cierra. `contenido` puede ser una función: se arma al abrirse.
 */
export default function Tooltip({ contenido, children, className = '', ancho = 'w-[23rem]', etiqueta }) {
  const id = useId()
  const disparadorRef = useRef(null)
  const cierreRef = useRef(null)
  const [abierto, setAbierto] = useState(false)

  const abrir = useCallback(() => {
    clearTimeout(cierreRef.current)
    setAbierto(true)
  }, [])
  const cerrarLuego = useCallback(() => {
    clearTimeout(cierreRef.current)
    cierreRef.current = setTimeout(() => setAbierto(false), 120)
  }, [])

  useEffect(() => () => clearTimeout(cierreRef.current), [])

  useEffect(() => {
    if (!abierto) return undefined
    const onKey = (e) => e.key === 'Escape' && setAbierto(false)
    const onScroll = (e) => {
      if (!(e.target instanceof Node && document.getElementById(id)?.contains(e.target))) setAbierto(false)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [abierto, id])

  // Debajo del disparador; arriba si no entra. Siempre dentro de la ventana.
  const ubicar = useCallback((globo) => {
    const disparador = disparadorRef.current
    if (!globo || !disparador) return
    const d = disparador.getBoundingClientRect()
    const g = globo.getBoundingClientRect()
    const entraAbajo = d.bottom + MARGEN + g.height <= window.innerHeight
    const top = entraAbajo ? d.bottom + MARGEN : Math.max(MARGEN, d.top - MARGEN - g.height)
    const left = Math.min(Math.max(MARGEN, d.left + d.width / 2 - g.width / 2), window.innerWidth - g.width - MARGEN)
    globo.style.top = `${top}px`
    globo.style.left = `${left}px`
    globo.style.visibility = 'visible'
  }, [])

  const cuerpo = abierto ? (typeof contenido === 'function' ? contenido() : contenido) : null

  return (
    <>
      <span
        ref={disparadorRef}
        tabIndex={0}
        role="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-describedby={abierto ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={cerrarLuego}
        onFocus={abrir}
        onBlur={cerrarLuego}
        onClick={(e) => {
          e.stopPropagation()
          setAbierto((v) => !v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setAbierto((v) => !v)
          }
        }}
        className={cn(
          'inline-flex cursor-help items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          className
        )}
      >
        {children}
      </span>
      {cuerpo &&
        createPortal(
          <div
            ref={ubicar}
            id={id}
            role="tooltip"
            onMouseEnter={abrir}
            onMouseLeave={cerrarLuego}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000, visibility: 'hidden' }}
            className={cn(
              surfacePopover,
              ancho,
              'max-h-[min(32rem,calc(100vh-1rem))] max-w-[calc(100vw-1rem)] overflow-y-auto p-3.5 text-left text-xs font-normal normal-case tracking-normal text-slate-700'
            )}
          >
            {cuerpo}
          </div>,
          document.body
        )}
    </>
  )
}
