import { useState } from 'react'
import Badge from '../ui/Badge'
import { IconDocument, IconDownload } from '../icons/Icons'
import { obtenerUrlComprobantePago } from '../../services/alquileresService'
import { estadoComprobante, nombrePeriodo, SITUACION_PERIODO, situacionPeriodo } from '../../utils/alquileresUi'
import { calloutClass, emptyStateClass } from '../../utils/ui'

const formatMonto = (monto) =>
  monto == null
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto))

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [y, m, d] = String(fecha).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function ComprobanteItem({ comprobante, periodo, onVer, abriendo }) {
  const estado = estadoComprobante(periodo)
  const datos = [
    comprobante.fecha_pago ? `Pagado el ${formatFecha(comprobante.fecha_pago)}` : null,
    comprobante.monto ? formatMonto(comprobante.monto) : null,
    `Registrado el ${formatFecha(comprobante.fecha_subida)}`,
  ].filter(Boolean)

  return (
    <li className="flex items-start gap-3 py-2.5">
      <IconDocument className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800" title={comprobante.nombre}>
          {comprobante.nombre}
        </p>
        <p className="text-xs text-slate-500">{datos.join(' · ')}</p>
        {comprobante.observaciones && <p className="mt-0.5 text-xs text-slate-600">“{comprobante.observaciones}”</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <Badge tone={estado.tone}>{estado.label}</Badge>
        <button
          type="button"
          onClick={() => onVer(comprobante)}
          disabled={abriendo}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-60"
        >
          <IconDownload className="h-3.5 w-3.5" />
          {abriendo ? 'Abriendo…' : 'Ver'}
        </button>
      </div>
    </li>
  )
}

/**
 * Períodos de alquiler de un contrato con su estado y sus comprobantes. Las acciones
 * (registrar comprobante, confirmar o deshacer el pago) las pone cada pantalla según el rol.
 */
export default function PeriodosPagoLista({
  periodos,
  hoyIso,
  renderAcciones,
  destacadoId = null,
  vacio = 'Todavía no hay períodos de alquiler.',
}) {
  const [abriendoId, setAbriendoId] = useState(null)
  const [errorArchivo, setErrorArchivo] = useState(null)

  const verComprobante = async (comprobante) => {
    setAbriendoId(comprobante.id)
    setErrorArchivo(null)
    const { data, error } = await obtenerUrlComprobantePago(comprobante.url_archivo)
    setAbriendoId(null)
    if (error || !data?.signedUrl) {
      setErrorArchivo(error?.message ?? 'No se pudo abrir el comprobante')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (!periodos?.length) return <p className={emptyStateClass}>{vacio}</p>

  return (
    <div className="space-y-3">
      {errorArchivo && <p className={calloutClass('danger')}>{errorArchivo}</p>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white">
        {periodos.map((periodo) => {
          const situacion = SITUACION_PERIODO[situacionPeriodo(periodo, hoyIso)]
          const comprobantes = periodo.comprobantes_pago ?? []
          const acciones = renderAcciones?.(periodo)
          return (
            <li
              key={periodo.id}
              className={`px-4 py-3.5 lg:px-5 ${periodo.id === destacadoId ? 'bg-brand-50/50' : ''}`}
              aria-current={periodo.id === destacadoId ? 'true' : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{nombrePeriodo(periodo.periodo)}</p>
                    <Badge tone={situacion.tone} dot>
                      {situacion.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="tabular-nums">{formatMonto(periodo.monto)}</span>
                    {periodo.fecha_vencimiento && <> · Vence el {formatFecha(periodo.fecha_vencimiento)}</>}
                    {periodo.estado === 'Pagado' && periodo.fecha_confirmacion && (
                      <> · Pago confirmado el {formatFecha(periodo.fecha_confirmacion)}</>
                    )}
                  </p>
                </div>
                {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
              </div>

              {comprobantes.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg bg-slate-50/70 px-3">
                  {comprobantes.map((comprobante) => (
                    <ComprobanteItem
                      key={comprobante.id}
                      comprobante={comprobante}
                      periodo={periodo}
                      onVer={verComprobante}
                      abriendo={abriendoId === comprobante.id}
                    />
                  ))}
                </ul>
              ) : (
                periodo.estado === 'Pendiente' && (
                  <p className="mt-1.5 text-xs text-slate-400">Sin comprobantes registrados.</p>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
