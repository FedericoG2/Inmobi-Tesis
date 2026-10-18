import {
  AVISO_AUMENTO_PORTAL,
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

function AvisoAumento({ className = '' }) {
  return (
    <div className={`rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80 ${className}`.trim()}>
      <p className="text-xs leading-relaxed text-amber-900">{AVISO_AUMENTO_PORTAL}</p>
    </div>
  )
}

function datosConfirmados(propuesta, ui) {
  const nuevo = ui.montoMostrar
  const anteriorGuardado = Number(propuesta.detalle_calculo?.monto_anterior)
  const anteriorBase =
    Number.isFinite(anteriorGuardado) && anteriorGuardado > 0
      ? anteriorGuardado
      : propuesta.monto_actual
  const hayAnterior = anteriorBase != null && Number(anteriorBase) !== Number(nuevo)
  let variacion = propuesta.variacion_pct
  if (hayAnterior && Number(anteriorBase) > 0 && nuevo != null) {
    variacion = Math.round((Number(nuevo) / Number(anteriorBase) - 1) * 10000) / 100
  }
  if (variacion == null || Number(variacion) === 0) variacion = null
  return { nuevo, anterior: hayAnterior ? anteriorBase : null, variacion }
}

export default function ProyeccionAumentoInquilinoCard({
  propuesta,
  loading,
  error,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200 ${className}`.trim()}>
        <p className="text-xs text-slate-500">Consultando el aumento...</p>
      </div>
    )
  }

  if (error || !propuesta) {
    return <AvisoAumento className={className} />
  }

  const ui = interpretarPropuestaAumentoPortal(propuesta)
  const confirmado = ui.etiqueta === 'aplicado' || ui.etiqueta === 'acordado'
  if (!confirmado || ui.montoMostrar == null) {
    return <AvisoAumento className={className} />
  }

  const indicador = badgeIndicador(propuesta.tipo_ajuste ?? propuesta.indice_tipo)
  const { nuevo, anterior, variacion } = datosConfirmados(propuesta, ui)

  return (
    <div
      className={`rounded-xl px-3 py-3 ring-1 ring-inset ${TONO_SITUACION[ui.tono] ?? TONO_SITUACION.slate} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconTrendUp />
          <span className="text-xs font-semibold">Próximo aumento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Confirmado
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${indicador.className}`}>
            {indicador.label}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {anterior != null && (
            <span className="text-sm text-slate-500 line-through">{formatMontoInquilino(anterior)}</span>
          )}
          <span className="text-xl font-bold leading-none">{formatMontoInquilino(nuevo)}</span>
        </div>
        {variacion != null && (
          <p className="mt-1 text-xs font-medium opacity-90">
            +{Number(variacion).toLocaleString('es-AR')}% respecto al monto actual
          </p>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed opacity-90">{ui.observacion}</p>
    </div>
  )
}
