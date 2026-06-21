import { useEffect, useState } from 'react'
import { Badge, Button } from '@tremor/react'
import { IconClipboard } from '../icons/NavIcons'
import ContratoDocumentosPanel from './ContratoDocumentosPanel'
import { calcularAumentosPendientes } from '../../services/aumentosService'
import { obtenerContratoDetalle } from '../../services/contratosService'
import {
  periodicidadLabelPorMeses,
  TIPO_AJUSTE_LABELS,
} from '../../utils/contratoAumentosPreview'
import { colorEstadoContrato, esContratoPlazoVencido, etiquetaEstadoContrato } from '../../utils/contratoVigencia'
import { interpretarPropuestaAumento } from '../../utils/aumentosUi'
import { formatearDniCuit } from '../../utils/normalizarContacto'

function hoyIsoLocal() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

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

export default function ContratoDetalleModal({
  open,
  contratoId,
  onClose,
  onVerInquilino,
  onVerPropiedad,
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
      const propuesta = (data ?? []).find((p) => Number(p.contrato_id) === Number(contrato.id))
      setPropuestaAumento(propuesta ?? null)
    })

    return () => {
      activo = false
    }
  }, [open, contrato?.id, contrato?.estado, contrato?.tipo_ajuste])

  const aumentos = contrato?.aumentos ?? []

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
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
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

            {contrato && (
              <Badge color={colorEstadoContrato(contrato)} className="shrink-0">
                {etiquetaEstadoContrato(contrato)}
              </Badge>
            )}
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
                          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
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
                          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
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
                  <DetalleFila
                    label="Próximo aumento"
                    value={formatFecha(contrato.fecha_proximo_aumento)}
                    icon={IconCalendar}
                  />
                  <DetalleFila
                    label="Último aumento"
                    value={formatFecha(contrato.fecha_ultimo_aumento)}
                    icon={IconCalendar}
                  />
                </div>
              </section>

              {propuestaAumento && (
                <section>
                  <SeccionTitulo>Próximo aumento</SeccionTitulo>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {cargandoAumento ? (
                      <p className="text-sm text-slate-600">Calculando monto sugerido...</p>
                    ) : (
                      (() => {
                        const ui = interpretarPropuestaAumento(propuestaAumento)
                        return (
                          <>
                            {ui.montoMostrar != null ? (
                              <p className="text-sm text-slate-700">
                                Monto {ui.montoEsAproximado ? 'orientativo' : 'propuesto'}:{' '}
                                <span className="font-semibold text-slate-900">
                                  {ui.montoEsAproximado ? '~' : ''}
                                  {formatMonto(ui.montoMostrar)}
                                </span>
                                {propuestaAumento.variacion_pct != null && (
                                  <span className="text-slate-500">
                                    {' '}
                                    ({Number(propuestaAumento.variacion_pct).toFixed(2)}%)
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-600">Monto aún no disponible.</p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">{ui.observacion}</p>
                            {ui.puedeConfirmar && (
                              <p className="mt-2 text-xs font-medium text-indigo-700">
                                Confirmá desde el módulo Aumentos.
                              </p>
                            )}
                          </>
                        )
                      })()
                    )}
                  </div>
                </section>
              )}

              <section>
                <SeccionTitulo>Historial de aumentos</SeccionTitulo>
                {aumentos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                    Todavía no hay aumentos confirmados para este contrato.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">Fecha</th>
                          <th className="px-3 py-2.5">Anterior</th>
                          <th className="px-3 py-2.5">Nuevo</th>
                          <th className="px-3 py-2.5">Variación</th>
                          <th className="px-3 py-2.5">Índice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aumentos.map((a) => (
                          <tr key={a.id} className="text-slate-700">
                            <td className="px-3 py-2.5 tabular-nums">{formatFecha(a.fecha_aplicacion)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMonto(a.monto_anterior)}</td>
                            <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900">
                              {formatMonto(a.monto_nuevo)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {a.porcentaje_aplicado != null
                                ? `${Number(a.porcentaje_aplicado).toFixed(2)}%`
                                : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs uppercase text-slate-500">
                              {a.indice_tipo ?? a.modo ?? '—'}
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
        </div>
      </div>
    </div>
  )
}
