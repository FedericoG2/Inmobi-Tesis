import { IconCalendar } from '../icons/Icons'
import { cn } from '../../utils/ui'

function FechaChip({ label, value, destacado = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 rounded-lg px-3 py-2 ring-1 ring-inset',
        destacado ? 'bg-brand-50 ring-brand-600/15' : 'bg-slate-50 ring-slate-200/80'
      )}
    >
      <IconCalendar className={cn('h-4 w-4', destacado ? 'text-brand-600' : 'text-slate-400')} />
      <span className="flex flex-col leading-tight">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={cn('text-sm font-medium', destacado ? 'text-brand-800' : 'text-slate-900')}>{value}</span>
      </span>
    </span>
  )
}

/** Vigencia del contrato: inicio, fin y día de vencimiento mensual. */
export function VigenciaContratoChips({ fechaInicio, fechaFin, diaVencimiento, formatFecha }) {
  if (!fechaInicio && !fechaFin && !diaVencimiento) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {fechaInicio && <FechaChip label="Desde" value={formatFecha(fechaInicio)} />}
      {fechaFin && <FechaChip label="Hasta" value={formatFecha(fechaFin)} />}
      {diaVencimiento != null && diaVencimiento !== '' && (
        <FechaChip label="Vencimiento" value={`Día ${diaVencimiento} de cada mes`} destacado />
      )}
    </div>
  )
}

/** Próximo período de pago en el dashboard. */
export function PeriodoPagoChips({ periodoLabel, vencimientoCorto }) {
  if (!periodoLabel && !vencimientoCorto) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {periodoLabel && <FechaChip label="Período" value={periodoLabel} />}
      {vencimientoCorto && <FechaChip label="Vencimiento" value={vencimientoCorto} destacado />}
    </div>
  )
}
