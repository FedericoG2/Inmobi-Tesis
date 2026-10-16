import { infoCategoria, infoEstado, badgePrioridad, PILL_RING_CLASS, RECLAMO_CHIP_CLASS } from '../../utils/reclamosUi'
import { badgeClass, optionCardClass } from '../../utils/ui'

function ReclamoChip({ icon: Icon, label }) {
  return (
    <span className={RECLAMO_CHIP_CLASS}>
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <span>{label}</span>
    </span>
  )
}

export function ReclamoCategoriaChip({ categoria }) {
  const info = infoCategoria(categoria)
  if (!info) return <span className="text-slate-400">—</span>
  return <ReclamoChip icon={info.icon} label={info.label} />
}

export function ReclamoEstadoChip({ estado }) {
  const info = infoEstado(estado)
  if (!info) return <span className="text-slate-400">—</span>
  const Icon = info.icon
  return (
    <span className={badgeClass(info.tone)}>
      <Icon className="h-3.5 w-3.5" />
      {info.label}
    </span>
  )
}

export function ReclamoPrioridadChip({ prioridad }) {
  const badge = badgePrioridad(prioridad)
  if (!badge) return <span className="text-slate-400">—</span>
  return <span className={`${PILL_RING_CLASS} ${badge.className}`}>{badge.label}</span>
}

export function ReclamoEstadoSelectChip({ estado, selected = false, onClick }) {
  const info = infoEstado(estado)
  if (!info) return null
  const Icon = info.icon

  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={optionCardClass(selected)}>
      <Icon className={`h-4 w-4 ${selected ? 'text-brand-600' : 'text-slate-400'}`} />
      <span>{info.label}</span>
    </button>
  )
}
