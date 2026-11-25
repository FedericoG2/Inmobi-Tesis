import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/ui'

/**
 * Título de la página en la barra superior.
 * El layout dibuja dos ranuras (título y acciones) y cada página manda su contenido con
 * `EncabezadoPagina`, mediante portales: el contenido sigue siendo de la página
 * (sus estados y funciones), solo se dibuja en la barra.
 */
const EncabezadoContext = createContext(null)

export function EncabezadoProvider({ children }) {
  const [ranuraTitulo, setRanuraTitulo] = useState(null)
  const [ranuraAcciones, setRanuraAcciones] = useState(null)

  return (
    <EncabezadoContext.Provider value={{ ranuraTitulo, ranuraAcciones, setRanuraTitulo, setRanuraAcciones }}>
      {children}
    </EncabezadoContext.Provider>
  )
}

/** Lugar de la barra superior donde va el título de la página. */
export function RanuraTitulo({ className }) {
  const { setRanuraTitulo } = useContext(EncabezadoContext)
  return <div ref={setRanuraTitulo} className={cn('min-w-0', className)} />
}

/** Lugar de la barra superior donde van las acciones principales de la página. */
export function RanuraAcciones({ className }) {
  const { setRanuraAcciones } = useContext(EncabezadoContext)
  return <div ref={setRanuraAcciones} className={cn('flex shrink-0 items-center gap-2 empty:hidden', className)} />
}

export function EncabezadoPagina({ titulo, subtitulo, accionTitulo, acciones }) {
  const ctx = useContext(EncabezadoContext)

  useEffect(() => {
    if (!titulo) return undefined
    const anterior = document.title
    document.title = `${titulo} · Inmobi`
    return () => {
      document.title = anterior
    }
  }, [titulo])

  if (!ctx) return null

  return (
    <>
      {ctx.ranuraTitulo &&
        createPortal(
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-[17px]">{titulo}</h1>
              {accionTitulo}
            </div>
            {subtitulo && (
              <p className="hidden truncate text-xs text-slate-500 md:block" title={typeof subtitulo === 'string' ? subtitulo : undefined}>
                {subtitulo}
              </p>
            )}
          </div>,
          ctx.ranuraTitulo
        )}
      {acciones && ctx.ranuraAcciones && createPortal(acciones, ctx.ranuraAcciones)}
    </>
  )
}
