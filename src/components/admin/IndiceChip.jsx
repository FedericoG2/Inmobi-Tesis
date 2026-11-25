import { chipIndicador } from '../../utils/aumentosUi'
import { RECLAMO_CHIP_CLASS } from '../../utils/reclamosUi'

/** Chip del índice de ajuste (IPC / ICL) con ícono y explicación al pasar el mouse. */
export default function IndiceChip({ tipo }) {
  const indice = chipIndicador(tipo)
  const Icon = indice.icon

  return (
    <span title={indice.tooltip ?? undefined} className={`${RECLAMO_CHIP_CLASS} cursor-help`}>
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {indice.label}
    </span>
  )
}
