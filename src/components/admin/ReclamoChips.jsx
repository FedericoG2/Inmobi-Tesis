import { infoCategoria, infoEstado, badgePrioridad, PILL_RING_CLASS, RECLAMO_CHIP_CLASS } from '../../utils/reclamosUi'

function ReclamoChip({ icon, label, compact = false }) {
  return (
    <span
      className={`${RECLAMO_CHIP_CLASS}${compact ? ' px-1.5 py-0.5 text-[11px]' : ''}`}
    >
      <span className={`leading-none${compact ? ' text-xs' : ' text-sm'}`}>{icon}</span>
      <span>{label}</span>
    </span>
  )
}

export function ReclamoCategoriaChip({ categoria }) {
  const info = infoCategoria(categoria)
  if (!info) return <span className="text-slate-400">—</span>
  return <ReclamoChip icon={info.icon} label={info.label} />
}

export function ReclamoEstadoChip({ estado, compact = false }) {
  const info = infoEstado(estado)
  if (!info) return <span className="text-slate-400">—</span>
  return <ReclamoChip icon={info.icon} label={info.label} compact={compact} />
}

export function ReclamoPrioridadChip({ prioridad }) {
  const badge = badgePrioridad(prioridad)
  if (!badge) return <span className="text-slate-400">—</span>
  return <span className={`${PILL_RING_CLASS} ${badge.className}`}>{badge.label}</span>
}

export function ReclamoEstadoSelectChip({ estado, selected = false, onClick }) {
  const info = infoEstado(estado)
  if (!info) return null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50'
      }`}
    >
      <span className="text-sm leading-none">{info.icon}</span>
      <span>{info.label}</span>
    </button>
  )
}
