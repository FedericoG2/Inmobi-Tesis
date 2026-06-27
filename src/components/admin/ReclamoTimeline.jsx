import { badgeEstado } from '../../utils/reclamosUi'

function formatearFechaHora(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EstadoTag({ estado }) {
  const badge = badgeEstado(estado)
  if (!badge) return null
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function tipoEvento(evento) {
  if (evento.estado_anterior == null && evento.estado_nuevo != null) return 'creacion'
  if (evento.estado_nuevo != null) return 'cambio'
  return 'nota'
}

const PUNTO_TONO = {
  creacion: 'bg-indigo-500',
  cambio: 'bg-blue-500',
  nota: 'bg-slate-300',
}

function EventoItem({ evento, numero, ultimo }) {
  const tipo = tipoEvento(evento)

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!ultimo && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" aria-hidden />}
      <span
        className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${PUNTO_TONO[tipo]}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-400">{numero}.</span>
          {tipo === 'creacion' && (
            <span className="text-sm font-medium text-slate-800">Reclamo creado</span>
          )}
          {tipo === 'cambio' && (
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-slate-700">
              {evento.estado_anterior && (
                <>
                  <EstadoTag estado={evento.estado_anterior} />
                  <span className="text-slate-400">→</span>
                </>
              )}
              <EstadoTag estado={evento.estado_nuevo} />
            </span>
          )}
          {tipo === 'nota' && <span className="text-sm font-medium text-slate-800">Nota</span>}
        </div>

        {evento.comentario && (
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {evento.comentario}
          </p>
        )}

        <p className="mt-0.5 text-[11px] text-slate-400">{formatearFechaHora(evento.fecha_creacion)}</p>
      </div>
    </li>
  )
}

export default function ReclamoTimeline({ eventos = [], loading = false, error = null }) {
  if (loading) {
    return <p className="text-xs text-slate-400">Cargando historial…</p>
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">{error}</p>
    )
  }

  if (!eventos.length) {
    return <p className="text-xs text-slate-400">Todavía no hay movimientos.</p>
  }

  return (
    <ul className="mt-1">
      {eventos.map((evento, idx) => (
        <EventoItem
          key={evento.id}
          evento={evento}
          numero={eventos.length - idx}
          ultimo={idx === eventos.length - 1}
        />
      ))}
    </ul>
  )
}
