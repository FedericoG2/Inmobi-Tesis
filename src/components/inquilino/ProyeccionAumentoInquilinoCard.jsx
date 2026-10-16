import {
  badgeIndicador,
  interpretarPropuestaAumentoPortal,
  TONO_SITUACION,
} from '../../utils/aumentosUi'
import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import { IconTrendingUp } from '../icons/Icons'
import { calloutClass, cn } from '../../utils/ui'

export default function ProyeccionAumentoInquilinoCard({
  propuesta,
  loading,
  error,
  mesAumento,
  className = '',
}) {
  if (loading) {
    return (
      <div className={calloutClass('neutral', className)}>
        <p className="text-slate-500">Calculando proyección del aumento…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={calloutClass('warning', className)}>
        {mesAumento ? `Aumento en ${mesAumento}. ` : ''}
        No pudimos estimar el monto. Consultá con la inmobiliaria.
      </div>
    )
  }

  if (!propuesta) {
    if (!mesAumento) return null
    return (
      <div className={calloutClass('warning', className)}>
        <span className="font-medium">Aumento en {mesAumento}.</span> Monto a confirmar con la inmobiliaria.
      </div>
    )
  }

  const ui = interpretarPropuestaAumentoPortal(propuesta)
  const indicador = badgeIndicador(propuesta.tipo_ajuste ?? propuesta.indice_tipo)

  return (
    <div className={cn('rounded-xl px-4 py-3.5 ring-1 ring-inset', TONO_SITUACION[ui.tono] ?? TONO_SITUACION.slate, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconTrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">{mesAumento ? `Aumento en ${mesAumento}` : 'Próximo aumento'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10">
            {ui.etiquetaEstado}
          </span>
          <span className={indicador.className}>{indicador.label}</span>
        </div>
      </div>

      {ui.montoMostrar != null && propuesta.monto_actual != null && (
        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm tabular-nums text-slate-500 line-through">
              {formatMontoInquilino(propuesta.monto_actual)}
            </span>
            <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
              {formatMontoInquilino(ui.montoMostrar)}
            </span>
            {ui.montoEsAproximado && <span className="text-xs font-medium opacity-80">aprox.</span>}
          </div>
          {propuesta.variacion_pct != null && (
            <p className="mt-1 text-sm opacity-90">
              +{Number(propuesta.variacion_pct).toLocaleString('es-AR')}% respecto al monto actual
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-sm leading-relaxed opacity-90">{ui.observacion}</p>
    </div>
  )
}
