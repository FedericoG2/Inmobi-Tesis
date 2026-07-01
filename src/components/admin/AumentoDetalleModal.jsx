import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from './AdminFormModalHeader'
import InquilinoDetalleModal from './InquilinoDetalleModal'
import PropiedadDetalleModal from './PropiedadDetalleModal'
import { supabase } from '../../supabaseClient'
import { detalleCalculoAumento, formatPeriodoIpc, hoyIsoLocal, observacionOperativaDetalle } from '../../utils/aumentosUi'

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
      <span className="truncate font-medium text-slate-800">{value ?? '—'}</span>
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
    <div className="mt-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Cálculo final
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-indigo-900">
          {formatMonto(montoBase)}
        </div>
        <span className="text-sm font-medium text-slate-400">×</span>
        {factorLabel != null && (
          <>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold tabular-nums text-slate-800">
              {factorLabel}
            </div>
            <span className="text-sm font-medium text-slate-400">=</span>
          </>
        )}
        <div className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 font-mono text-sm font-bold tabular-nums text-emerald-900">
          {formatMonto(montoResultado)}
        </div>
      </div>
    </div>
  )
}

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </h3>
  )
}

function IconTrendUp({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
      />
    </svg>
  )
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

function IconBuilding({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008H17.25v-.008Z"
      />
    </svg>
  )
}

const verDetalleLinkClass =
  'shrink-0 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline'

function DetalleFila({ label, value, icon: Icon, action, children, className = '' }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p className="break-words text-sm font-medium leading-tight text-slate-800">{value}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function IconAlerta({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

function AdvertenciaAproximado({ advertencia }) {
  if (!advertencia) return null
  return (
    <div className="mb-3 flex gap-2.5 rounded-lg bg-slate-800 px-3 py-2 text-slate-100">
      <IconAlerta className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div className="text-xs leading-relaxed">
        <span className="font-semibold text-amber-300">ATENCIÓN: </span>
        {advertencia.texto}
        {advertencia.proximaPublicacionLabel && (
          <span className="ml-1 text-slate-300">
            Próxima publicación estimada:{' '}
            <span className="font-semibold text-white">{advertencia.proximaPublicacionLabel}</span>
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
    <ol className="space-y-1.5 text-xs">
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
          2. ICL al cierre del período ({periodo.hastaLabel})
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
      <div className="max-h-44 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2.5 py-1 text-left font-medium">Mes</th>
              <th className="px-2.5 py-1 text-right font-medium">Variación IPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ipcDetalle.map((m) => (
              <tr key={`${m.anio}-${m.mes}`} className={m.publicado ? '' : 'bg-amber-50/60'}>
                <td className="px-2.5 py-1 text-slate-700">{formatPeriodoIpc(m.anio, m.mes)}</td>
                <td className="px-2.5 py-1 text-right font-mono text-slate-900">
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
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-xs font-semibold text-emerald-800">Factor acumulado del período</span>
          <span className="font-mono text-sm font-bold tabular-nums text-emerald-900">
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
    }
    onConfirmar(propuestaFinal)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aumento-detalle-titulo"
        className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <AdminFormModalHeader
          title="Detalle del Cálculo de Aumento de Alquiler"
          titleId="aumento-detalle-titulo"
          icon={<IconTrendUp className="h-5 w-5" />}
        />

        <div className="border-b border-slate-100 px-6 py-3">
          <SeccionTitulo className="mb-2">Partes</SeccionTitulo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetalleFila
              label="Inquilino"
              value={propuesta.inquilino_nombre ?? '—'}
              icon={IconUser}
              action={
                inquilinoFull ? (
                  <button
                    type="button"
                    onClick={() => setDetalleInquilinoOpen(true)}
                    className={verDetalleLinkClass}
                  >
                    Ver detalle
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
                  <button
                    type="button"
                    onClick={() => setDetallePropiedadOpen(true)}
                    className={verDetalleLinkClass}
                  >
                    Ver detalle
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        <div className="px-6 py-3">
          <AdvertenciaAproximado advertencia={advertencia} />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                  <p className="text-[11px] font-medium text-indigo-700">Monto actual</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-indigo-900">
                    {formatMonto(detalle.montoActual)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-emerald-700">Monto ajustado</p>
                    {ui.puedeConfirmar && (
                      <button
                        type="button"
                        onClick={() => setMostrarRedondeo((v) => !v)}
                        disabled={confirmando || ui.montoMostrar == null}
                        className="shrink-0 rounded border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Redondear
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <p className="text-lg font-semibold tabular-nums text-emerald-900">
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
                      <span className="text-xs font-medium tabular-nums text-emerald-700">
                        (+{variacionEditada}%)
                      </span>
                    )}
                  </div>
                  {ui.puedeConfirmar && esManual && (
                    <p className="mt-1 text-[10px] font-medium text-amber-700">Monto redondeado</p>
                  )}
                  {ui.puedeConfirmar && mostrarRedondeo && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-emerald-100 pt-2">
                      <button
                        type="button"
                        onClick={() => redondear(1000)}
                        disabled={confirmando}
                        className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Al mil
                      </button>
                      <button
                        type="button"
                        onClick={() => redondear(100)}
                        disabled={confirmando}
                        className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        A la centena
                      </button>
                      {esManual && (
                        <button
                          type="button"
                          onClick={restaurarSugerido}
                          disabled={confirmando}
                          className="px-1 py-0.5 text-[10px] font-medium text-slate-500 hover:underline disabled:opacity-50"
                        >
                          Restaurar sugerido
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DatoInline
                    label="Tipo de ajuste"
                    value={TIPO_AJUSTE_LABEL[detalle.tipo] ?? detalle.tipo?.toUpperCase()}
                  />
                  <span className="hidden text-slate-300 sm:inline">·</span>
                  <DatoInline
                    label="Período"
                    value={`${periodo.desdeLabel} a ${periodo.hastaLabel}`}
                  />
                </div>
              </div>

              {ui.puedeConfirmar && (
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <label htmlFor="aumento-notas" className="mb-1 block">
                    <SeccionTitulo>Notas (opcional)</SeccionTitulo>
                  </label>
                  <textarea
                    id="aumento-notas"
                    rows={1}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    disabled={confirmando}
                    placeholder="Aclaraciones del aumento…"
                    className="w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                  />
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                <SeccionTitulo className="mb-1">Observación</SeccionTitulo>
                <p className="text-xs leading-relaxed text-slate-600">
                  {observacionOperativaDetalle(detalle)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <SeccionTitulo>Cómo se calculó</SeccionTitulo>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="whitespace-nowrap">
                    {periodo.desdeLabel} → {periodo.hastaLabel}
                  </span>
                </div>
              </div>

              {detalle.tipo === 'icl' ? <PasoIcl detalle={detalle} /> : <PasoIpc detalle={detalle} />}

              <ResumenCalculoFinal
                detalle={detalle}
                montoFinal={montoValido ? montoNum : ui.montoMostrar}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {onVerHistorial && (
              <button
                type="button"
                onClick={() => onVerHistorial(propuesta)}
                disabled={confirmando}
                className="text-sm font-medium text-indigo-600 underline-offset-2 transition hover:text-indigo-800 hover:underline disabled:opacity-50"
              >
                Ver historial
              </button>
            )}
            {estaConfirmado && onVerComprobante && (
              <button
                type="button"
                onClick={() => onVerComprobante(propuesta)}
                disabled={confirmando}
                className="text-sm font-medium text-indigo-600 underline-offset-2 transition hover:text-indigo-800 hover:underline disabled:opacity-50"
              >
                Ver comprobante
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {ui.puedeConfirmar && onConfirmar && onToggleRevisado && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={revisado}
                  onChange={onToggleRevisado}
                  disabled={confirmando}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Cálculo revisado
              </label>
            )}
            <Button variant="secondary" onClick={onClose} disabled={confirmando}>
              Cerrar
            </Button>
            {ui.puedeConfirmar && onConfirmar && (
              <Button
                loading={confirmando}
                disabled={confirmando || !revisado || !montoValido}
                onClick={handleConfirmar}
                className="!border-indigo-600 !bg-indigo-600 !text-white hover:!border-indigo-700 hover:!bg-indigo-700 disabled:!border-slate-300 disabled:!bg-slate-200 disabled:!text-slate-500"
              >
                Confirmar aumento
              </Button>
            )}
          </div>
        </div>
      </div>

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
    </div>
  )
}
