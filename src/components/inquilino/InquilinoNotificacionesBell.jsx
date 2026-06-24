import { useEffect, useRef, useState } from 'react'

function IconBell({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  )
}

const actionClassName =
  'relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:text-slate-800'

export default function InquilinoNotificacionesBell() {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined

    const cerrarSiClickFuera = (event) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', cerrarSiClickFuera)
    document.addEventListener('touchstart', cerrarSiClickFuera)

    return () => {
      document.removeEventListener('mousedown', cerrarSiClickFuera)
      document.removeEventListener('touchstart', cerrarSiClickFuera)
    }
  }, [abierto])

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={actionClassName}
        aria-label="Notificaciones"
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        <IconBell />
      </button>

      {abierto && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Notificaciones</p>
            <p className="mt-0.5 text-xs text-slate-500">Novedades de tu alquiler</p>
          </div>

          <div className="px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No tenés novedades por ahora.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Acá vas a ver avisos cuando haya movimientos sobre tus reclamos, contrato u otras
              novedades de la inmobiliaria.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
