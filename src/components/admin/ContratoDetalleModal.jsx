import { useEffect, useState } from 'react'
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
import {
  IconArrowRight,
  IconCalendar,
  IconChart,
  IconCheckCircle,
  IconClipboard,
  IconCurrency,
  IconPin,
  IconUser,
} from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { calloutClass, eyebrow, surfaceMuted } from '../../utils/ui'
import DetalleFila from '../ui/DetailField'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const formatMonto = (monto) => {
  if (monto == null || monto === '') return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
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

function SeccionTitulo({ children }) {
  return (
    <h3 className={`${eyebrow} mb-2.5`}>{children}</h3>
  )
}

function EstadoContratoBadge({ contrato }) {
  const badge = badgeEstadoContratoUi(contrato)
  return <span className={badge.className}>{badge.label}</span>
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
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      layer={apilado ? 'stacked' : 'base'}
      labelledBy="contrato-detalle-titulo"
    >
      <ModalHeader
        titleId="contrato-detalle-titulo"
        icon={IconClipboard}
        title={cargando ? 'Cargando contrato…' : (inquilino?.nombre_completo ?? 'Contrato')}
        subtitle={
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{propiedad?.direccion ?? '—'}</span>
            {contrato && <EstadoContratoBadge contrato={contrato} />}
          </span>
        }
        onClose={onClose}
      />

      <ModalBody>
          {cargando && <p className="text-sm text-slate-500">Cargando datos del contrato…</p>}

          {error && <p className={calloutClass('danger')}>{error}</p>}

          {!cargando && !error && contrato && (
            <div className="space-y-6">
              {esContratoPlazoVencido(contrato) && (
                <div className={calloutClass('danger')}>
                  <p className="font-medium">
                    El plazo contractual venció el {formatFecha(contrato.fecha_fin)}.
                  </p>
                  <p className="mt-1">
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
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                          {inquilino.nombre_completo}
                        </p>
                        <button
                          type="button"
                          onClick={() => onVerInquilino(inquilino)}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
                        >
                          Ver ficha
                          <IconArrowRight className="h-3 w-3" />
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
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                          {propiedad.direccion}
                        </p>
                        <button
                          type="button"
                          onClick={() => onVerPropiedad(propiedad)}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
                        >
                          Ver ficha
                          <IconArrowRight className="h-3 w-3" />
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
                  <p className="mb-2 text-xs text-slate-500">Actualizando montos estimados…</p>
                ) : null}
                {cronogramaAumentos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm text-slate-500">
                    Este contrato no tiene fechas de aumento programadas en su vigencia.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
                                <Badge tone="success" icon={IconCheckCircle}>
                                  Aplicado
                                </Badge>
                              ) : (
                                <Badge tone="warning">Pendiente</Badge>
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
                  <p className={`${surfaceMuted} whitespace-pre-line px-3 py-2.5 text-sm text-slate-700`}>
                    {contrato.observaciones.trim()}
                  </p>
                </section>
              )}
            </div>
          )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {onFinalizar && contrato && puedeFinalizarContrato(contrato) && (
          <Button variant="warning" onClick={() => onFinalizar(contrato)}>
            {etiquetaFinalizarContrato(contrato)}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
