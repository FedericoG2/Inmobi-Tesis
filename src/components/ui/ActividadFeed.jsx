import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fechaHoraCompleta, infoTipoActividad, tiempoRelativo } from '../../utils/actividadUi'
import { cn, iconTileClass } from '../../utils/ui'

/**
 * Lista de eventos del registro de actividad (dashboard admin, campana de notificaciones).
 * `rutaDe(evento)` define a dónde lleva cada evento; `noLeidoDesde` resalta los nuevos.
 */
export default function ActividadFeed({ eventos, rutaDe, noLeidoDesde, compact = false, onNavegar }) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <ol className="divide-y divide-slate-100">
      {eventos.map((evento) => {
        const { icon: Icon, tone } = infoTipoActividad(evento)
        const ruta = rutaDe?.(evento)
        const nuevo = noLeidoDesde != null && new Date(evento.fecha_creacion).getTime() > noLeidoDesde

        const contenido = (
          <>
            <span className={iconTileClass(tone, 'sm', 'circle')}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-900">{evento.titulo}</p>
                <time
                  dateTime={evento.fecha_creacion}
                  title={fechaHoraCompleta(evento.fecha_creacion)}
                  className="shrink-0 text-xs tabular-nums text-slate-400"
                >
                  {tiempoRelativo(evento.fecha_creacion, ahora)}
                </time>
              </div>
              {evento.detalle ? (
                <p className={cn('mt-0.5 text-sm text-slate-500', compact ? 'line-clamp-2' : 'line-clamp-3')}>
                  {evento.detalle}
                </p>
              ) : null}
            </div>
            {nuevo ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Nuevo" /> : null}
          </>
        )

        const clase = cn('flex items-start gap-3 px-4 py-3', nuevo && 'bg-brand-50/40')

        return (
          <li key={evento.id}>
            {ruta ? (
              <Link to={ruta} onClick={onNavegar} className={cn(clase, 'transition-colors hover:bg-slate-50')}>
                {contenido}
              </Link>
            ) : (
              <div className={clase}>{contenido}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
