import {
  badgeIndicador,
  interpretarPropuestaAumentoPortal,
  TONO_SITUACION,
} from '../../utils/aumentosUi'
import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'

function IconTrendUp({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
    </svg>
  )
}

export default function ProyeccionAumentoInquilinoCard({
  propuesta,
  loading,
  error,
  mesAumento,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200 ${className}`.trim()}>
        <p className="text-xs text-slate-500">Calculando proyección del aumento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80 ${className}`.trim()}>
        <p className="text-xs leading-relaxed text-amber-900">
          {mesAumento ? `Aumento en ${mesAumento}. ` : ''}
          No pudimos estimar el monto. Consultá con la inmobiliaria.
        </p>
      </div>
    )
  }

  if (!propuesta) {
    if (!mesAumento) return null
    return (
      <div className={`rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80 ${className}`.trim()}>
        <p className="text-xs leading-relaxed text-amber-900">
          <span className="font-semibold">Aumento en {mesAumento}.</span> Monto a confirmar con la inmobiliaria.
        </p>
      </div>
    )
  }

  const ui = interpretarPropuestaAumentoPortal(propuesta)
  const indicador = badgeIndicador(propuesta.tipo_ajuste ?? propuesta.indice_tipo)

  return (
    <div
      className={`rounded-xl px-3 py-3 ring-1 ring-inset ${TONO_SITUACION[ui.tono] ?? TONO_SITUACION.slate} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconTrendUp />
          <span className="text-xs font-semibold">
            {mesAumento ? `Aumento en ${mesAumento}` : 'Próximo aumento'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {ui.etiquetaEstado}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${indicador.className}`}>
            {indicador.label}
          </span>
        </div>
      </div>

      {ui.montoMostrar != null && propuesta.monto_actual != null && (
        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-slate-500 line-through">{formatMontoInquilino(propuesta.monto_actual)}</span>
            <span className="text-xl font-bold leading-none">{formatMontoInquilino(ui.montoMostrar)}</span>
            {ui.montoEsAproximado && (
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">aprox.</span>
            )}
          </div>
          {propuesta.variacion_pct != null && (
            <p className="mt-1 text-xs font-medium opacity-90">
              +{Number(propuesta.variacion_pct).toLocaleString('es-AR')}% respecto al monto actual
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs leading-relaxed opacity-90">{ui.observacion}</p>
    </div>
  )
}
