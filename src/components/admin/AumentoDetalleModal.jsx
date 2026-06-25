import { Button } from '@tremor/react'
import { detalleCalculoAumento, formatPeriodoIpc, hoyIsoLocal } from '../../utils/aumentosUi'

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

function Dato({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  )
}

function SeccionTitulo({ children }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
    <div className="mb-4 flex gap-3 rounded-xl bg-slate-800 px-4 py-3 text-slate-100">
      <IconAlerta className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="text-sm leading-relaxed">
        <span className="font-semibold text-amber-300">ATENCIÓN: </span>
        {advertencia.texto}
        {advertencia.proximaPublicacionLabel && (
          <div className="mt-1.5 text-xs text-slate-300">
            Próxima publicación estimada del índice:{' '}
            <span className="font-semibold text-white">{advertencia.proximaPublicacionLabel}</span>
            <span className="text-slate-400"> (estimada, no oficial)</span>
          </div>
        )}
      </div>
    </div>
  )
}

function PasoIcl({ detalle }) {
  const { iclValores, periodo } = detalle
  if (!iclValores) return null

  return (
    <ol className="space-y-2.5 text-sm">
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
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Mes</th>
              <th className="px-3 py-1.5 text-right font-medium">Variación IPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ipcDetalle.map((m) => (
              <tr key={`${m.anio}-${m.mes}`} className={m.publicado ? '' : 'bg-amber-50/60'}>
                <td className="px-3 py-1.5 text-slate-700">{formatPeriodoIpc(m.anio, m.mes)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-900">
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
        <div className="mt-2 flex justify-between gap-3 text-sm">
          <span className="text-slate-600">Factor acumulado del período</span>
          <span className="font-mono font-medium text-slate-900">× {ipcFactor.toFixed(6)}</span>
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
  confirmando = false,
  revisado = false,
  onToggleRevisado,
}) {
  if (!open || !propuesta) return null

  const detalle = detalleCalculoAumento(propuesta, hoyIsoLocal())
  const { ui, badge, periodo, formula, advertencia } = detalle

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
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <IconTrendUp />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="aumento-detalle-titulo"
                className="truncate text-base font-semibold text-slate-900"
              >
                {propuesta.inquilino_nombre ?? 'Aumento'}
              </h2>
              <p className="truncate text-sm text-slate-600">
                {propuesta.propiedad_direccion ?? '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <AdvertenciaAproximado advertencia={advertencia} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
              <p className="text-xs font-medium text-indigo-700">Monto actual</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-indigo-800">
                {formatMonto(detalle.montoActual)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <p className="text-xs font-medium text-emerald-700">Monto ajustado</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-800">
                {ui.montoMostrar == null ? (
                  '—'
                ) : (
                  <>
                    {ui.montoEsAproximado ? '~' : ''}
                    {formatMonto(ui.montoMostrar)}
                  </>
                )}
              </p>
              {detalle.variacionPct != null && (
                <p className="text-xs font-medium tabular-nums text-emerald-600">
                  (+{detalle.variacionPct}%)
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-x-6 gap-y-2 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-2">
            <Dato
              label="Tipo de ajuste"
              value={TIPO_AJUSTE_LABEL[detalle.tipo] ?? detalle.tipo?.toUpperCase()}
            />
            <Dato label="Período considerado" value={`${periodo.desdeLabel} a ${periodo.hastaLabel}`} />
            <Dato label="El nuevo monto rige desde" value={periodo.hastaLabel} />
            <Dato label="Estado" value={ui.etiquetaEstado ?? ui.etiquetaTexto} />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <SeccionTitulo>Cómo se calculó</SeccionTitulo>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                  {badge.label}
                </span>
                <span>
                  {periodo.desdeLabel} → {periodo.hastaLabel}
                </span>
              </div>
            </div>

            {detalle.tipo === 'icl' ? <PasoIcl detalle={detalle} /> : <PasoIpc detalle={detalle} />}

            {formula && (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                <p className="font-mono text-xs leading-relaxed text-slate-700">{formula}</p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <SeccionTitulo>Observación</SeccionTitulo>
            <p className="text-sm leading-relaxed text-slate-600">{ui.observacion}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-3">
          {ui.puedeConfirmar && onConfirmar && onToggleRevisado && (
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
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
              disabled={confirmando || !revisado}
              onClick={() => onConfirmar(propuesta)}
              className="!border-indigo-500 !bg-indigo-600 !text-white hover:!bg-indigo-700"
            >
              Confirmar aumento
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
