function IconCalendar({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5V7.5a1.5 1.5 0 0 0-1.5-1.5h-15a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5Z"
      />
    </svg>
  )
}

function FechaChip({ label, value, destacado = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs ring-1 ${
        destacado
          ? 'bg-indigo-50 text-indigo-800 ring-indigo-100'
          : 'bg-slate-50 text-slate-700 ring-slate-100'
      }`}
    >
      <IconCalendar className={destacado ? 'text-indigo-500' : 'text-slate-400'} />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
        <span className="font-semibold">{value}</span>
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
    <div className="mt-2 flex flex-wrap gap-2">
      {periodoLabel && <FechaChip label="Período" value={periodoLabel} />}
      {vencimientoCorto && (
        <FechaChip label="Vencimiento" value={vencimientoCorto} destacado />
      )}
    </div>
  )
}
