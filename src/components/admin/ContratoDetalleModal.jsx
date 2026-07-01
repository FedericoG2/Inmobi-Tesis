import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { IconClipboard } from '../icons/NavIcons'
import ContratoDocumentosPanel from './ContratoDocumentosPanel'
import { calcularAumentosPendientes } from '../../services/aumentosService'
import { obtenerContratoDetalle } from '../../services/contratosService'
import {
  armarCronogramaAumentosContrato,
  contarAumentosProgramados,
  etiquetaCantidadAumentos,
  periodicidadLabelPorMeses,
  TIPO_AJUSTE_LABELS,
} from '../../utils/contratoAumentosPreview'
import {
  badgeEstadoContratoUi,
  duracionContratoLabel,
  esContratoPlazoVencido,
  etiquetaFinalizarContrato,
  puedeFinalizarContrato,
} from '../../utils/contratoVigencia'
import { formatPeriodoMesAnio } from '../../utils/aumentosUi'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const formatMonto = (monto) => {
  if (monto == null || monto === '') return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

function IconUser({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  )
}

function IconPin({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  )
}

function IconCalendar({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  )
}

function IconCurrency({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

function IconChart({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  )
}

function textoMontoCronograma(fila) {
  if (fila.monto != null) {
    return (
      <>
        {fila.montoEsEstimado ? <span className="text-slate-500">~</span> : null}
        {formatMonto(fila.monto)}
      </>
    )
  }
  if (!fila.aplicado) {
    return <span className="text-xs font-medium italic text-slate-400">A calcular</span>
  }
  return <span className="text-slate-400">—</span>
}

function DetalleFila({ label, value, icon: Icon, className = '', children }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {children ?? <p className="truncate text-sm font-medium text-slate-800">{value}</p>}
      </div>
    </div>
  )
}

function SeccionTitulo({ children }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
  )
}

function EstadoContratoBadge({ contrato }) {
  const badge = badgeEstadoContratoUi(contrato)
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

export default function ContratoDetalleModal({
  open,
  contratoId,
  onClose,
  onVerInquilino,
  onVerPropiedad,
  onFinalizar,
  apilado = false,
}) {
  const [contrato, setContrato] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [propuestaAumento, setPropuestaAumento] = useState(null)
  const [cargandoAumento, setCargandoAumento] = useState(false)

  useEffect(() => {
    if (!open || !contratoId) {
      setContrato(null)
      setError(null)
      setPropuestaAumento(null)
      setCargando(false)
      setCargandoAumento(false)
      return undefined
    }

    let activo = true
    setCargando(true)
    setError(null)
    setContrato(null)
    setPropuestaAumento(null)

    obtenerContratoDetalle(contratoId).then(({ data, error: err }) => {
      if (!activo) return
      setCargando(false)
      if (err) {
        setError(err.message ?? 'No se pudo cargar el contrato')
        return
      }
      if (!data) {
        setError('Contrato no encontrado')
        return
      }
      setContrato(data)
    })

    return () => {
      activo = false
    }
  }, [open, contratoId])

  useEffect(() => {
    if (!open || !contrato?.id) return undefined
    if (contrato.estado !== 'activo' || !['ipc', 'icl'].includes(contrato.tipo_ajuste)) {
      setPropuestaAumento(null)
      return undefined
    }

    let activo = true
    setCargandoAumento(true)

    calcularAumentosPendientes({ incluirProximos: true, diasProximos: 365 }).then(({ data, error }) => {
      if (!activo) return
      setCargandoAumento(false)
      if (error || !data) {
        setPropuestaAumento(null)
        return
      }
      const lista = Array.isArray(data?.propuestas) ? data.propuestas : []
      const propuesta = lista.find((p) => Number(p.contrato_id) === Number(contrato.id))
      setPropuestaAumento(propuesta ?? null)
    })

    return () => {
      activo = false
    }
  }, [open, contrato?.id, contrato?.estado, contrato?.tipo_ajuste])

  const cronogramaAumentos = contrato
    ? armarCronogramaAumentosContrato(contrato, propuestaAumento)
    : []
  const duracionPlazo = contrato ? duracionContratoLabel(contrato.fecha_inicio, contrato.fecha_fin) : null
  const cantidadAumentos = contrato ? contarAumentosProgramados(contrato) : null

  if (!open) return null

  const inquilino = contrato?.inquilinos
  const propiedad = contrato?.propiedades

  return (
    <div className={`fixed inset-0 ${apilado ? 'z-[60]' : 'z-50'} flex items-center justify-center p-4`}>
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contrato-detalle-titulo"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="shrink-0 border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <IconClipboard className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="contrato-detalle-titulo"
                className="truncate text-base font-semibold text-slate-900"
              >
                {cargando ? 'Cargando contrato...' : (inquilino?.nombre_completo ?? 'Contrato')}
              </h2>
              <p className="truncate text-sm text-slate-600">
                {propiedad?.direccion ?? '—'}
              </p>
            </div>

            {contrato && <EstadoContratoBadge contrato={contrato} />}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {cargando && (
            <p className="text-sm text-slate-500">Cargando datos del contrato...</p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {!cargando && !error && contrato && (
            <div className="space-y-6">
              {esContratoPlazoVencido(contrato) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-900">
                    El plazo contractual venció el {formatFecha(contrato.fecha_fin)}.
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    El contrato sigue activo en el sistema. Finalizalo para liberar la propiedad y dejar de
                    incluirlo en aumentos.
                  </p>
                </div>
              )}

              <section>
                <SeccionTitulo>Partes</SeccionTitulo>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetalleFila label="Inquilino" value={inquilino?.nombre_completo ?? '—'} icon={IconUser}>
                    {onVerInquilino && inquilino ? (
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {inquilino.nombre_completo}
                        </p>
                        <button
                          type="button"
                          onClick={() => onVerInquilino(inquilino)}
                          className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          Ver detalle
                        </button>
                      </div>
                    ) : undefined}
                  </DetalleFila>
                  <DetalleFila
                    label="Propiedad"
                    value={propiedad?.direccion ?? '—'}
                    icon={IconPin}
                    className="sm:col-span-2"
                  >
                    {onVerPropiedad && propiedad ? (
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {propiedad.direccion}
                        </p>
                        <button
                          type="button"
                          onClick={() => onVerPropiedad(propiedad)}
                          className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          Ver detalle
                        </button>
                      </div>
                    ) : undefined}
                  </DetalleFila>
                  {propiedad?.tipo && (
                    <DetalleFila label="Tipo de unidad" value={propiedad.tipo} icon={IconPin} />
                  )}
                  {propiedad?.estado && (
                    <DetalleFila label="Estado de la propiedad" value={propiedad.estado} icon={IconPin} />
                  )}
                </div>

              </section>

              <section>
                <SeccionTitulo>Condiciones</SeccionTitulo>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetalleFila
                    label="Vigencia"
                    value={`${formatFecha(contrato.fecha_inicio)} → ${formatFecha(contrato.fecha_fin)}`}
                    icon={IconCalendar}
                    className="sm:col-span-2"
                  />
                  <DetalleFila
                    label="Duración del plazo"
                    value={duracionPlazo ?? '—'}
                    icon={IconCalendar}
                  />
                  <DetalleFila
                    label="Aumentos en el plazo"
                    value={etiquetaCantidadAumentos(cantidadAumentos)}
                    icon={IconChart}
                  />
                  <DetalleFila
                    label="Monto actual"
                    value={formatMonto(contrato.monto_alquiler)}
                    icon={IconCurrency}
                  />
                  <DetalleFila
                    label="Día de vencimiento"
                    value={contrato.dia_vencimiento ? `Día ${contrato.dia_vencimiento}` : '—'}
                    icon={IconCalendar}
                  />
                  <DetalleFila
                    label="Tipo de ajuste"
                    value={TIPO_AJUSTE_LABELS[contrato.tipo_ajuste] ?? contrato.tipo_ajuste ?? '—'}
                    icon={IconChart}
                  />
                  <DetalleFila
                    label="Periodicidad del ajuste"
                    value={periodicidadLabelPorMeses(contrato.periodicidad_meses)}
                    icon={IconChart}
                  />
                </div>
              </section>

              <section>
                <SeccionTitulo>Cronograma de aumentos</SeccionTitulo>
                {cronogramaAumentos.length > 0 && cronogramaAumentos.some((f) => !f.aplicado) ? (
                  <p className="mb-2 text-xs text-slate-500">
                    Solo el próximo aumento pendiente muestra monto estimado; el resto figura como a calcular
                    cuando corresponda.
                  </p>
                ) : null}
                {cargandoAumento && cronogramaAumentos.some((f) => !f.aplicado) ? (
                  <p className="mb-2 text-xs text-slate-500">Actualizando montos estimados...</p>
                ) : null}
                {cronogramaAumentos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                    Este contrato no tiene fechas de aumento programadas en su vigencia.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">Período</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3 py-2.5">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cronogramaAumentos.map((fila) => (
                          <tr key={fila.fecha} className="text-slate-700">
                            <td className="px-3 py-2.5 tabular-nums">{formatPeriodoMesAnio(fila.fecha)}</td>
                            <td className="px-3 py-2.5">
                              {fila.aplicado ? (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                  Aplicado
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums text-slate-900">
                              {textoMontoCronograma(fila)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <ContratoDocumentosPanel
                contratoId={contrato.id}
                propiedadId={contrato.propiedad_id}
                activo={contrato.estado === 'activo' || contrato.estado === 'programado'}
              />

              {contrato.observaciones?.trim() && (
                <section>
                  <SeccionTitulo>Observaciones</SeccionTitulo>
                  <p className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700">
                    {contrato.observaciones.trim()}
                  </p>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onFinalizar && contrato && puedeFinalizarContrato(contrato) && (
            <Button
              type="button"
              onClick={() => onFinalizar(contrato)}
              className="!border-amber-500 !bg-amber-600 !text-white hover:!border-amber-600 hover:!bg-amber-700"
            >
              {etiquetaFinalizarContrato(contrato)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
