import { ReclamoEstadoChip } from './ReclamoChips'
import { IconArrowRight } from '../icons/Icons'
import { surfaceCard } from '../../utils/ui'

function formatearFechaHora(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}-${month}-${year} | ${hours}:${minutes} hs.`
}

function EstadoTag({ estado }) {
  return <ReclamoEstadoChip estado={estado} />
}

function tipoEvento(evento) {
  if (evento.estado_anterior == null && evento.estado_nuevo != null) return 'creacion'
  if (evento.estado_nuevo != null) return 'cambio'
  return 'nota'
}

function tituloEvento(evento, tipo) {
  if (tipo === 'creacion') return 'Reclamo creado'
  if (tipo === 'nota') return 'Nota agregada'
  return evento.estado_nuevo ?? 'Cambio de estado'
}

function EventoItem({ evento, numero, ultimo }) {
  const tipo = tipoEvento(evento)
  const titulo = tituloEvento(evento, tipo)

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {!ultimo && (
        <span
          className="absolute bottom-0 left-3.5 top-8 w-px bg-slate-200"
          aria-hidden
        />
      )}

      <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
        {numero}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-slate-900">{titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatearFechaHora(evento.fecha_creacion)}</p>

        {tipo === 'cambio' && evento.estado_anterior && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <EstadoTag estado={evento.estado_anterior} />
            <IconArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <EstadoTag estado={evento.estado_nuevo} />
          </div>
        )}

        {evento.comentario && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {evento.comentario}
          </p>
        )}
      </div>
    </li>
  )
}

export default function ReclamoTimeline({
  eventos = [],
  loading = false,
  error = null,
  className = '',
}) {
  const panelClass = `${surfaceCard} px-4 py-3 ${className}`.trim()

  if (loading) {
    return (
      <div className={panelClass}>
        <p className="text-xs text-slate-500">Cargando historial…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={panelClass}>
        <p className="text-xs font-medium text-red-600">{error}</p>
      </div>
    )
  }

  if (!eventos.length) {
    return (
      <div className={panelClass}>
        <p className="text-xs text-slate-500">Todavía no hay movimientos.</p>
      </div>
    )
  }

  return (
    <div className={`${panelClass} py-4`}>
      <ul>
        {eventos.map((evento, idx) => (
          <EventoItem
            key={evento.id}
            evento={evento}
            numero={eventos.length - idx}
            ultimo={idx === eventos.length - 1}
          />
        ))}
      </ul>
    </div>
  )
}
