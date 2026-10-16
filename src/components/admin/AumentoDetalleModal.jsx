import { useEffect, useState } from 'react'
import InquilinoDetalleModal from './InquilinoDetalleModal'
import PropiedadDetalleModal from './PropiedadDetalleModal'
import { supabase } from '../../supabaseClient'
import { detalleCalculoAumento, formatPeriodoIpc, hoyIsoLocal, observacionOperativaDetalle } from '../../utils/aumentosUi'
import { mesesIpcPeriodo } from '../../utils/calcularAumento'
import DetalleFila from '../ui/DetailField'
import {
  IconAlert,
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDocument,
  IconTrendingUp,
  IconUser,
} from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { calloutClass, cn, eyebrow, inputClass, labelClass, surfaceMuted, textareaClass } from '../../utils/ui'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

const formatPct = (valor) => {
  if (valor == null) return '—'
  return `${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
}

const TIPO_AJUSTE_LABEL = {
  icl: 'ICL (Índice Casa Propia)',
  ipc: 'IPC (Nivel General)',
  porcentaje_fijo: 'Porcentaje fijo',
  manual: 'Manual',
}

function DatoInline({ label, value }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 whitespace-nowrap text-xs">
      <span className="shrink-0 text-slate-500">{label}:</span>
      <span className="truncate font-medium text-slate-900">{value ?? '—'}</span>
    </span>
  )
}

function ResumenCalculoFinal({ detalle, montoFinal }) {
  const montoBase = detalle.montoActual
  const montoResultado = montoFinal ?? detalle.montoPropuesto ?? detalle.ui?.montoMostrar
  const factor =
    detalle.tipo === 'ipc'
      ? detalle.ipcFactor
      : detalle.iclValores?.proporcion

  if (montoBase == null || montoResultado == null) return null

  const factorLabel =
    factor != null
      ? detalle.tipo === 'icl'
        ? factor.toFixed(4)
        : factor.toFixed(6)
      : null

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className={`${eyebrow} mb-2`}>Cálculo final</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
        <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-700">{formatMonto(montoBase)}</span>
        <span className="text-slate-400">×</span>
        {factorLabel != null && (
          <>
            <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-700">{factorLabel}</span>
            <span className="text-slate-400">=</span>
          </>
        )}
        <span className="rounded-md bg-brand-600 px-2.5 py-1.5 text-sm font-semibold text-white">
          {formatMonto(montoResultado)}
        </span>
      </div>
    </div>
  )
}

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3 className={`${eyebrow} ${className}`}>{children}</h3>
  )
}

const verDetalleLinkClass =
  'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-800'

function CargaManualIndices({ propuesta, onAplicar, disabled }) {
  const tipo = (propuesta.tipo_ajuste ?? propuesta.indice_tipo ?? '').toLowerCase()
  const meses =
    Array.isArray(propuesta.ipc_detalle) && propuesta.ipc_detalle.length > 0
      ? propuesta.ipc_detalle
      : mesesIpcPeriodo(propuesta.fecha_desde, propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento)

  const [iclInicio, setIclInicio] = useState(
    propuesta.indice_valor_inicio != null ? String(propuesta.indice_valor_inicio) : ''
  )
  const [iclFin, setIclFin] = useState(
    propuesta.indice_valor_fin != null ? String(propuesta.indice_valor_fin) : ''
  )
  const [ipcMeses, setIpcMeses] = useState({})

  useEffect(() => {
    setIclInicio(propuesta.indice_valor_inicio != null ? String(propuesta.indice_valor_inicio) : '')
    setIclFin(propuesta.indice_valor_fin != null ? String(propuesta.indice_valor_fin) : '')
    const inicial = {}
    for (const mes of meses) {
      const clave = `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
      if (mes.publicado && mes.variacion_pct != null) inicial[clave] = String(mes.variacion_pct)
      else inicial[clave] = ''
    }
    setIpcMeses(inicial)
  }, [propuesta.contrato_id, propuesta.fecha_desde, propuesta.fecha_hasta])

  const inputIndiceClass = cn(inputClass, 'h-9 font-mono text-xs')

  const handleAplicar = () => {
    if (tipo === 'icl') {
      const inicio = Number(iclInicio)
      const fin = Number(iclFin)
      if (!Number.isFinite(inicio) || inicio <= 0 || !Number.isFinite(fin) || fin <= 0) return
      onAplicar({ iclInicio: inicio, iclFin: fin })
      return
    }

    const cargados = {}
    for (const mes of meses) {
      const clave = `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
      const valor = Number(ipcMeses[clave])
      if (!Number.isFinite(valor) || valor <= 0) return
      cargados[clave] = valor
    }
    onAplicar({ ipcMeses: cargados })
  }

  const iclListo =
    Number(iclInicio) > 0 && Number(iclFin) > 0 && Number.isFinite(Number(iclInicio)) && Number.isFinite(Number(iclFin))
  const ipcListo = meses.every((mes) => {
    const clave = `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
    const valor = Number(ipcMeses[clave])
    return Number.isFinite(valor) && valor > 0
  })

  return (
    <div className={calloutClass('warning')}>
      <p className="font-medium">Cargar índices a mano</p>
      <p className="mt-0.5 text-amber-800">
        Usá los valores oficiales (BCRA para ICL, INDEC para IPC). El sistema calcula con la misma fórmula.
      </p>

      {tipo === 'icl' ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-700">
            ICL inicio
            <input
              type="number"
              min="0"
              step="0.0001"
              value={iclInicio}
              onChange={(e) => setIclInicio(e.target.value)}
              disabled={disabled}
              className={`mt-1 ${inputIndiceClass}`}
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            ICL cierre
            <input
              type="number"
              min="0"
              step="0.0001"
              value={iclFin}
              onChange={(e) => setIclFin(e.target.value)}
              disabled={disabled}
              className={`mt-1 ${inputIndiceClass}`}
            />
          </label>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {meses.map((mes) => {
            const clave = `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
            return (
              <label key={clave} className="text-xs font-medium text-slate-700">
                IPC {formatPeriodoIpc(mes.anio, mes.mes)}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ipcMeses[clave] ?? ''}
                  onChange={(e) => setIpcMeses((prev) => ({ ...prev, [clave]: e.target.value }))}
                  disabled={disabled}
                  placeholder="%"
                  className={`mt-1 ${inputIndiceClass}`}
                />
              </label>
            )
          })}
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleAplicar}
        disabled={disabled || (tipo === 'icl' ? !iclListo : !ipcListo)}
        className="mt-3"
      >
        Calcular con estos valores
      </Button>
    </div>
  )
}

function AdvertenciaAproximado({ advertencia }) {
  if (!advertencia) return null
  return (
    <div className={cn(calloutClass('warning'), 'flex gap-2.5')}>
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        {advertencia.texto}
        {advertencia.proximaPublicacionLabel && (
          <span className="ml-1 text-amber-800">
            Próxima publicación estimada: <span className="font-medium">{advertencia.proximaPublicacionLabel}</span>
          </span>
        )}
      </div>
    </div>
  )
}

function PasoIcl({ detalle }) {
  const { iclValores, periodo } = detalle
  if (!iclValores) return null

  return (
    <ol className="space-y-2 text-sm">
      <li className="flex justify-between gap-3">
        <span className="text-slate-600">
          1. ICL al inicio del período ({periodo.desdeLabel})
        </span>
        <span className="font-mono font-medium text-slate-900">
          {iclValores.inicio != null ? Number(iclValores.inicio).toLocaleString('es-AR') : '—'}
        </span>
      </li>
      <li className="flex justify-between gap-3">
        <span className="text-slate-600">
          2. ICL al cierre del período ({periodo.hastaLabel}
          {detalle.esAproximado ? ' · último publicado' : ''})
        </span>
        <span className="font-mono font-medium text-slate-900">
          {iclValores.fin != null ? Number(iclValores.fin).toLocaleString('es-AR') : '—'}
        </span>
      </li>
      <li className="flex justify-between gap-3">
        <span className="text-slate-600">3. Proporción (cierre ÷ inicio)</span>
        <span className="font-mono font-medium text-slate-900">
          {iclValores.proporcion != null ? `× ${iclValores.proporcion.toFixed(4)}` : '—'}
        </span>
      </li>
    </ol>
  )
}

function PasoIpc({ detalle }) {
  const { ipcDetalle, ipcFactor } = detalle
  if (!ipcDetalle?.length) return null

  return (
    <div>
      <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Mes</th>
              <th className="px-3 py-2 text-right font-medium">Variación IPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ipcDetalle.map((m) => (
              <tr key={`${m.anio}-${m.mes}`} className={m.publicado ? '' : 'bg-amber-50/60'}>
                <td className="px-3 py-1.5 text-slate-600">{formatPeriodoIpc(m.anio, m.mes)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums text-slate-900">
                  {m.publicado ? (
                    formatPct(m.variacion_pct)
                  ) : (
                    <span className="text-amber-700">sin publicar</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ipcFactor != null && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">Factor acumulado del período</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
            × {ipcFactor.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function AumentoDetalleModal({
  open,
  propuesta,
  onClose,
  onConfirmar,
  onVerHistorial,
  onVerComprobante,
  confirmando = false,
  revisado = false,
  onToggleRevisado,
  onAnterior,
  hayAnterior = false,
  onSiguiente,
  haySiguiente = false,
  onAplicarIndicesManuales,
  inquilinos = [],
  propiedades = [],
}) {
  const detalleTmp = propuesta ? detalleCalculoAumento(propuesta, hoyIsoLocal()) : null
  const montoSugerido = detalleTmp?.ui?.montoMostrar ?? null

  const [montoEditado, setMontoEditado] = useState('')
  const [notas, setNotas] = useState('')
  const [mostrarRedondeo, setMostrarRedondeo] = useState(false)
  const [partesIds, setPartesIds] = useState({ inquilino_id: null, propiedad_id: null })
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)

  useEffect(() => {
    if (!open || !propuesta?.contrato_id) {
      setPartesIds({ inquilino_id: null, propiedad_id: null })
      return
    }

    let activo = true
    supabase
      .from('contratos')
      .select('inquilino_id, propiedad_id')
      .eq('id', propuesta.contrato_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        setPartesIds({
          inquilino_id: data?.inquilino_id ?? null,
          propiedad_id: data?.propiedad_id ?? null,
        })
      })

    return () => {
      activo = false
    }
  }, [open, propuesta?.contrato_id])

  useEffect(() => {
    if (!open) {
      setDetalleInquilinoOpen(false)
      setDetallePropiedadOpen(false)
    }
  }, [open])

  useEffect(() => {
    if (open && propuesta) {
      setMontoEditado(montoSugerido != null ? String(Math.round(Number(montoSugerido))) : '')
      setNotas('')
      setMostrarRedondeo(false)
    }
  }, [open, propuesta?.contrato_id, montoSugerido])

  if (!open || !propuesta) return null

  const inquilinoFull =
    inquilinos.find((i) => String(i.id) === String(partesIds.inquilino_id)) ?? null
  const propiedadFull =
    propiedades.find((p) => String(p.id) === String(partesIds.propiedad_id)) ?? null

  const detalle = detalleTmp
  const { ui, badge, periodo, advertencia } = detalle

  const montoMinimo = (() => {
    const sugerido = montoSugerido != null ? Math.round(Number(montoSugerido)) : 0
    const actual =
      detalle?.montoActual != null ? Math.round(Number(detalle.montoActual)) : 0
    return Math.max(sugerido, actual, 0)
  })()

  const montoNum =
    montoEditado === '' || Number.isNaN(Number(montoEditado)) ? null : Number(montoEditado)
  const montoValido = montoNum != null && montoNum >= montoMinimo
  const esManual =
    montoValido && montoSugerido != null && Math.round(montoNum) !== Math.round(Number(montoSugerido))

  const variacionEditada =
    montoValido && detalle.montoActual != null && Number(detalle.montoActual) > 0
      ? Math.round(((montoNum / Number(detalle.montoActual)) - 1) * 10000) / 100
      : detalle.variacionPct

  const redondear = (multiplo) => {
    const base = montoValido ? montoNum : montoSugerido
    if (base == null) return
    const redondeado = Math.round(Number(base) / multiplo) * multiplo
    setMontoEditado(String(Math.max(redondeado, montoMinimo)))
    setMostrarRedondeo(false)
  }

  const restaurarSugerido = () => {
    setMontoEditado(montoSugerido != null ? String(Math.round(Number(montoSugerido))) : '')
    setMostrarRedondeo(false)
  }

  const estaConfirmado = Boolean(propuesta.ya_acordado || propuesta.ya_aplicado)

  const handleConfirmar = () => {
    if (!onConfirmar) return
    const propuestaFinal = {
      ...propuesta,
      monto_propuesto: montoValido ? montoNum : propuesta.monto_propuesto,
      variacion_pct: variacionEditada,
      modo: esManual ? 'manual' : propuesta.modo ?? 'calculado',
      notas: notas.trim() || null,
      detalle_calculo: propuesta.detalle_calculo
        ? {
            ...propuesta.detalle_calculo,
            monto_nuevo: montoValido ? montoNum : propuesta.detalle_calculo.monto_nuevo,
            variacion_pct: variacionEditada,
            modo: esManual ? 'manual' : propuesta.detalle_calculo.modo ?? propuesta.modo,
          }
        : propuesta.detalle_calculo,
    }
    onConfirmar(propuestaFinal)
  }

  return (
    <>
      <Modal open={open} onClose={confirmando ? undefined : onClose} size="5xl" labelledBy="aumento-detalle-titulo">
        <ModalHeader
          titleId="aumento-detalle-titulo"
          icon={IconTrendingUp}
          title="Detalle del cálculo de aumento"
          subtitle={`${propuesta.inquilino_nombre ?? '—'} · ${periodo.desdeLabel} a ${periodo.hastaLabel}`}
          onClose={confirmando ? undefined : onClose}
        />

        <ModalBody className="space-y-5">
          <section>
            <SeccionTitulo className="mb-2.5">Partes</SeccionTitulo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetalleFila
                label="Inquilino"
                value={propuesta.inquilino_nombre ?? '—'}
                icon={IconUser}
                action={
                  inquilinoFull ? (
                    <button type="button" onClick={() => setDetalleInquilinoOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                  ) : null
                }
              />
              <DetalleFila
                label="Propiedad"
                value={propuesta.propiedad_direccion ?? '—'}
                icon={IconBuilding}
                action={
                  propiedadFull ? (
                    <button type="button" onClick={() => setDetallePropiedadOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                  ) : null
                }
              />
            </div>
          </section>

          {(advertencia || (onAplicarIndicesManuales && ui.etiqueta === 'sin_indices')) && (
            <div className="space-y-3">
              <AdvertenciaAproximado advertencia={advertencia} />
              {onAplicarIndicesManuales && ui.etiqueta === 'sin_indices' && (
                <CargaManualIndices
                  propuesta={propuesta}
                  onAplicar={(valores) => onAplicarIndicesManuales(propuesta.contrato_id, valores)}
                  disabled={confirmando}
                />
              )}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`${surfaceMuted} px-4 py-3`}>
                  <p className="text-xs text-slate-500">Monto actual</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-700">
                    {formatMonto(detalle.montoActual)}
                  </p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-brand-700">Monto ajustado</p>
                    {ui.puedeConfirmar && (
                      <button
                        type="button"
                        onClick={() => setMostrarRedondeo((v) => !v)}
                        disabled={confirmando || ui.montoMostrar == null}
                        className="shrink-0 text-xs font-medium text-brand-600 transition hover:text-brand-800 disabled:opacity-50"
                      >
                        Redondear
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                      {ui.montoMostrar == null ? (
                        '—'
                      ) : (
                        <>
                          {ui.montoEsAproximado && !esManual ? '~' : ''}
                          {formatMonto(montoValido ? montoNum : ui.montoMostrar)}
                        </>
                      )}
                    </p>
                    {variacionEditada != null && (
                      <span className="text-xs font-medium tabular-nums text-emerald-600">+{variacionEditada}%</span>
                    )}
                  </div>
                  {ui.puedeConfirmar && esManual && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Monto redondeado</p>
                  )}
                  {ui.puedeConfirmar && mostrarRedondeo && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-brand-200/60 pt-2.5">
                      <Button variant="secondary" size="sm" onClick={() => redondear(1000)} disabled={confirmando}>
                        Al mil
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => redondear(100)} disabled={confirmando}>
                        A la centena
                      </Button>
                      {esManual && (
                        <Button variant="ghost" size="sm" onClick={restaurarSugerido} disabled={confirmando}>
                          Restaurar sugerido
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-3.5 py-2.5">
                <DatoInline label="Tipo de ajuste" value={TIPO_AJUSTE_LABEL[detalle.tipo] ?? detalle.tipo?.toUpperCase()} />
                <span className="hidden text-slate-300 sm:inline">·</span>
                <DatoInline label="Período" value={`${periodo.desdeLabel} a ${periodo.hastaLabel}`} />
              </div>

              {ui.puedeConfirmar && (
                <div>
                  <label htmlFor="aumento-notas" className={labelClass}>
                    Notas <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    id="aumento-notas"
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    disabled={confirmando}
                    placeholder="Aclaraciones del aumento…"
                    className={cn(textareaClass, 'min-h-0 resize-none')}
                  />
                </div>
              )}

              <div className={calloutClass('neutral')}>
                <p className="font-medium text-slate-900">Observación</p>
                <p className="mt-0.5 text-slate-600">{observacionOperativaDetalle(detalle)}</p>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <SeccionTitulo>Cómo se calculó</SeccionTitulo>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={badge.className}>{badge.label}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    {periodo.desdeLabel} → {periodo.hastaLabel}
                  </span>
                </div>
              </div>

              {detalle.tipo === 'icl' ? <PasoIcl detalle={detalle} /> : <PasoIpc detalle={detalle} />}

              <ResumenCalculoFinal detalle={detalle} montoFinal={montoValido ? montoNum : ui.montoMostrar} />
            </section>
          </div>
        </ModalBody>

        <ModalFooter className="justify-between">
          <div className="flex flex-wrap items-center gap-1">
            {onVerHistorial && (
              <Button variant="ghost" size="sm" icon={IconClock} onClick={() => onVerHistorial(propuesta)} disabled={confirmando}>
                Ver historial
              </Button>
            )}
            {estaConfirmado && onVerComprobante && (
              <Button
                variant="ghost"
                size="sm"
                icon={IconDocument}
                onClick={() => onVerComprobante(propuesta)}
                disabled={confirmando}
              >
                Ver comprobante
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {ui.puedeConfirmar && onConfirmar && onToggleRevisado && (
              <label
                className={cn(
                  'flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition',
                  revisado
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={revisado}
                  onChange={onToggleRevisado}
                  disabled={confirmando}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Cálculo revisado
              </label>
            )}
            {onAnterior && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onAnterior}
                disabled={confirmando || !hayAnterior}
                aria-label="Anterior a revisar"
                title="Anterior a revisar"
              >
                <IconChevronLeft className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
            {onSiguiente && (
              <Button
                variant="secondary"
                iconRight={IconChevronRight}
                onClick={onSiguiente}
                disabled={confirmando || !haySiguiente}
              >
                Siguiente a revisar
              </Button>
            )}
            {ui.puedeConfirmar && onConfirmar ? (
              <Button
                icon={IconCheck}
                loading={confirmando}
                disabled={!revisado || !montoValido}
                onClick={handleConfirmar}
              >
                Confirmar aumento
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose} disabled={confirmando}>
                Cerrar
              </Button>
            )}
          </div>
        </ModalFooter>
      </Modal>

      <InquilinoDetalleModal
        open={detalleInquilinoOpen}
        inquilino={inquilinoFull}
        onClose={() => setDetalleInquilinoOpen(false)}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadFull}
        onClose={() => setDetallePropiedadOpen(false)}
        apilado
      />
    </>
  )
}
