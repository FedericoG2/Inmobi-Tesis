import {
  AVISO_AUMENTO_PORTAL,
  badgeIndicador,
  interpretarPropuestaAumentoPortal,
  TONO_SITUACION,
} from '../../utils/aumentosUi'
import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import { IconTrendingUp } from '../icons/Icons'
import { calloutClass, cn } from '../../utils/ui'
import { MontoTrazable, TrazaAumento } from '../calculo/TrazaCalculo'
import { explicarAumento } from '../../utils/trazabilidadCalculo'

function AvisoAumento({ className = '' }) {
  return <div className={calloutClass('warning', className)}>{AVISO_AUMENTO_PORTAL}</div>
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

/**
 * Aumento del mes del próximo pago (RF-078): si ya está confirmado muestra el monto nuevo,
 * el porcentaje y desde cuándo rige; si no, solo el aviso, sin un monto estimado.
 */
export default function ProyeccionAumentoInquilinoCard({ propuesta, loading, error, className = '' }) {
  if (loading) {
    return (
      <div className={calloutClass('neutral', className)}>
        <p className="text-slate-500">Consultando el aumento…</p>
      </div>
    )
  }

  if (error || !propuesta) {
    return <AvisoAumento className={className} />
  }

  const ui = interpretarPropuestaAumentoPortal(propuesta)
  if (ui.etiqueta !== 'aplicado' || ui.montoMostrar == null) {
    return <AvisoAumento className={className} />
  }

  const indicador = badgeIndicador(propuesta.tipo_ajuste ?? propuesta.indice_tipo)
  const { nuevo, anterior, variacion } = datosConfirmados(propuesta, ui)

  return (
    <div className={cn('rounded-xl px-4 py-3.5 ring-1 ring-inset', TONO_SITUACION[ui.tono] ?? TONO_SITUACION.slate, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconTrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Aumento del período</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10">
            Confirmado
          </span>
          <span className={indicador.className}>{indicador.label}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {anterior != null && (
            <span className="text-sm tabular-nums text-slate-500 line-through">{formatMontoInquilino(anterior)}</span>
          )}
          <MontoTrazable
            className="text-2xl font-semibold leading-none tabular-nums tracking-tight"
            etiqueta="Ver cómo se calculó el aumento"
            contenido={
              propuesta.detalle_calculo
                ? () => (
                    <TrazaAumento explicacion={explicarAumento(propuesta.detalle_calculo, { montoFinal: nuevo, notas: propuesta.notas })} />
                  )
                : null
            }
          >
            {formatMontoInquilino(nuevo)}
          </MontoTrazable>
        </div>
        {variacion != null && (
          <p className="mt-1 text-sm opacity-90">+{Number(variacion).toLocaleString('es-AR')}% respecto al monto anterior</p>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed opacity-90">{ui.observacion}</p>
    </div>
  )
}
