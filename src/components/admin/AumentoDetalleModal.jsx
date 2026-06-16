import { Button } from '@tremor/react'
import { detalleCalculoAumento, hoyIsoLocal } from '../../utils/aumentosUi'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
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

export default function AumentoDetalleModal({
  open,
  propuesta,
  onClose,
  onConfirmar,
  confirmando = false,
}) {
  if (!open || !propuesta) return null

  const detalle = detalleCalculoAumento(propuesta, hoyIsoLocal())
  const { ui, filasIndice, formula } = detalle

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
        className="relative z-10 w-full max-w-3xl rounded-2xl border border-slate-100 bg-white shadow-xl"
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

        <div className="px-6 py-4">
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <SeccionTitulo>Índices utilizados</SeccionTitulo>
              {filasIndice.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <dl className="space-y-1.5">
                  {filasIndice.map((fila) => (
                    <div key={fila.label} className="flex justify-between gap-3 text-sm">
                      <dt className="text-slate-500">{fila.label}</dt>
                      <dd className="font-mono text-xs font-medium text-slate-900">{fila.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <SeccionTitulo>Cálculo</SeccionTitulo>
              {formula ? (
                <p className="font-mono text-xs leading-relaxed text-slate-700">{formula}</p>
              ) : (
                <p className="text-sm text-slate-500">—</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <SeccionTitulo>Observación</SeccionTitulo>
            <p className="text-sm leading-relaxed text-slate-600">{ui.observacion}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onClose} disabled={confirmando}>
            Cerrar
          </Button>
          {ui.puedeConfirmar && onConfirmar && (
            <Button
              loading={confirmando}
              disabled={confirmando}
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
