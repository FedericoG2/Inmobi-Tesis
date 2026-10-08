import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useActividad } from '../../hooks/useActividad'
import ActividadFeed from './ActividadFeed'
import { IconBell } from '../icons/Icons'
import { buttonClass, surfacePopover } from '../../utils/ui'

function leerVistoHasta(clave) {
  try {
    const valor = Number(localStorage.getItem(clave))
    return Number.isFinite(valor) && valor > 0 ? valor : 0
  } catch {
    return 0
  }
}

function guardarVistoHasta(clave, valor) {
  try {
    localStorage.setItem(clave, String(valor))
  } catch {
    // Sin almacenamiento disponible: el contador se reinicia al recargar.
  }
}

/**
 * Campana de notificaciones alimentada por el registro de actividad.
 * - Cuenta los eventos nuevos que no generó el propio usuario.
 * - Muestra un aviso en vivo cuando otra persona (o el sistema) produce un evento.
 */
export default function NotificacionesBell({ rutaDe, subtitulo = 'Últimos movimientos', vacio }) {
  const { user } = useAuth()
  const toast = useToast()
  const clave = `inmobi.notificaciones.vistoHasta.${user?.id ?? 'anon'}`

  const [abierto, setAbierto] = useState(false)
  const [vistoHasta, setVistoHasta] = useState(() => leerVistoHasta(clave))
  const [resaltarDesde, setResaltarDesde] = useState(null)
  const contenedorRef = useRef(null)

  const { eventos, loading, faltaMigracion } = useActividad({
    limite: 15,
    onNuevo: (evento) => {
      if (user?.id && evento.creado_por === user.id) return
      toast.info(evento.titulo, evento.detalle)
    },
  })

  const ajenos = eventos.filter((e) => !(user?.id && e.creado_por === user.id))
  const sinLeer = ajenos.filter((e) => new Date(e.fecha_creacion).getTime() > vistoHasta).length

  useEffect(() => {
    if (!abierto) return undefined

    const cerrarSiClickFuera = (event) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target)) setAbierto(false)
    }
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', cerrarSiClickFuera)
    document.addEventListener('touchstart', cerrarSiClickFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('mousedown', cerrarSiClickFuera)
      document.removeEventListener('touchstart', cerrarSiClickFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  const alternar = () => {
    if (!abierto) {
      const ahora = Date.now()
      setResaltarDesde(vistoHasta)
      setVistoHasta(ahora)
      guardarVistoHasta(clave, ahora)
    }
    setAbierto((v) => !v)
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={alternar}
        className={`${buttonClass({ variant: 'ghost', size: 'icon' })} relative`}
        aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        <IconBell className="h-5 w-5" />
        {sinLeer > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className={`${surfacePopover} absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden`}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
            <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Cargando…</p>
            ) : faltaMigracion ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                El registro de actividad todavía no está instalado en la base de datos.
              </p>
            ) : eventos.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <IconBell className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-slate-700">No hay novedades por ahora</p>
                {vacio ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{vacio}</p> : null}
              </div>
            ) : (
              <ActividadFeed
                eventos={eventos}
                rutaDe={rutaDe}
                noLeidoDesde={resaltarDesde}
                compact
                onNavegar={() => setAbierto(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
