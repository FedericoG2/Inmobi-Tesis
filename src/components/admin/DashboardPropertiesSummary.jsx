const ESTADO_ESTILOS = {
  Alquilada: { dot: 'bg-brand-600', pill: 'bg-brand-50 text-brand-800 ring-brand-100' },
  Disponible: { dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-700 ring-slate-200' },
  Mantenimiento: { dot: 'bg-slate-300', pill: 'bg-slate-50 text-slate-600 ring-slate-200' },
}

const ORDEN_ESTADOS = ['Alquilada', 'Disponible', 'Mantenimiento']

export default function DashboardPropertiesSummary({ propiedadesPorEstado = [] }) {
  const mapa = Object.fromEntries(propiedadesPorEstado.map((row) => [row.estado, row.cantidad]))
  const total = propiedadesPorEstado.reduce((sum, row) => sum + (row.cantidad ?? 0), 0)

  if (total === 0) {
    return (
      <p className="text-xs text-slate-500">Sin propiedades registradas en la cartera.</p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ORDEN_ESTADOS.filter((estado) => mapa[estado] != null).map((estado) => {
        const estilo = ESTADO_ESTILOS[estado] ?? ESTADO_ESTILOS.Disponible
        const cantidad = mapa[estado] ?? 0
        const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0

        return (
          <div
            key={estado}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${estilo.pill}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${estilo.dot}`} aria-hidden />
            <span>{estado}</span>
            <span className="font-bold tabular-nums">{cantidad}</span>
            <span className="text-[10px] opacity-70">({pct}%)</span>
          </div>
        )
      })}
    </div>
  )
}
