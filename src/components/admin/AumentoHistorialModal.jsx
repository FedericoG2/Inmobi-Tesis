import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { listarHistorialAumentos } from '../../services/aumentosService'
import { badgeIndicador, formatFechaAumento } from '../../utils/aumentosUi'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

const formatPct = (valor) => {
  if (valor == null) return null
  return `${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
}

const MODO_LABEL = {
  calculado: 'Calculado',
  manual: 'Manual',
  porcentaje_fijo: 'Porcentaje fijo',
}

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function IconHistory({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

function IconReceipt({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

function IconUndo({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

function EstadoTag({ aplicado }) {
  if (aplicado) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        Aplicado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
      Acordado · pendiente de aplicar
    </span>
  )
}

function VariacionAprox({ item }) {
  const aprox = Boolean(item?.detalle_calculo?.es_aproximado)
  if (!aprox) return null
  return (
    <span className="text-[11px] font-medium text-amber-600" title="El monto se confirmó con índice provisorio">
      aprox.
    </span>
  )
}

function FilaHistorial({ item, posicion, onVerComprobante, onDeshacer, disabled }) {
  const indicador = badgeIndicador(item.indice_tipo)
  const pct = formatPct(item.porcentaje_aplicado)

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
          {posicion}
        </span>
        <span className="mt-1 w-px flex-1 bg-slate-200 last:hidden" aria-hidden />
      </div>

      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              Rige desde el {formatFechaAumento(item.fecha_aplicacion)}
            </span>
            {item.indice_tipo && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${indicador.className}`}
              >
                {indicador.label}
              </span>
            )}
          </div>
          <EstadoTag aplicado={item.aplicado} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="tabular-nums text-slate-500 line-through">
            {formatMonto(item.monto_anterior)}
          </span>
          <span className="text-slate-400">→</span>
          <span className="tabular-nums font-semibold text-emerald-700">
            {formatMonto(item.monto_nuevo)}
          </span>
          {pct && (
            <span className="tabular-nums text-xs font-medium text-emerald-600">(+{pct})</span>
          )}
          <VariacionAprox item={item} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          <span>{MODO_LABEL[item.modo] ?? item.modo}</span>
          <span>·</span>
          <span>Registrado el {formatFechaHora(item.fecha_creacion)}</span>
        </div>

        {item.notas && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{item.notas}</p>
        )}

        {(onVerComprobante || onDeshacer) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
            {onVerComprobante && (
              <button
                type="button"
                onClick={() => onVerComprobante(item)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <IconReceipt className="h-3.5 w-3.5" />
                Ver comprobante
              </button>
            )}
            {onDeshacer && (
              <button
                type="button"
                onClick={() => onDeshacer(item)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
              >
                <IconUndo className="h-3.5 w-3.5" />
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export default function AumentoHistorialModal({
  open,
  propuesta,
  onClose,
  onVerComprobante,
  onDeshacer,
  accionDeshabilitada = false,
  reloadToken = 0,
}) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const contratoId = propuesta?.contrato_id ?? null

  useEffect(() => {
    if (!open || contratoId == null) return

    let activo = true
    setCargando(true)
    setError(null)

    listarHistorialAumentos(contratoId).then(({ data, error: err }) => {
      if (!activo) return
      if (err) {
        setError(err.message)
        setItems([])
      } else {
        setItems(data ?? [])
      }
      setCargando(false)
    })

    return () => {
      activo = false
    }
  }, [open, contratoId, reloadToken])

  if (!open || !propuesta) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar historial"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aumento-historial-titulo"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <IconHistory />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="aumento-historial-titulo"
                className="truncate text-base font-semibold text-slate-900"
              >
                Historial de aumentos
              </h2>
              <p className="truncate text-sm text-slate-600">
                {propuesta.inquilino_nombre ?? '—'}
                {propuesta.propiedad_direccion ? ` · ${propuesta.propiedad_direccion}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {cargando ? (
            <p className="py-8 text-center text-sm text-slate-500">Cargando historial…</p>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">Sin aumentos registrados todavía</p>
              <p className="mt-1 text-xs text-slate-400">
                Cuando confirmes el primer aumento de este contrato, va a aparecer acá.
              </p>
            </div>
          ) : (
            <ol className="relative">
              {items.map((item, idx) => (
                <FilaHistorial
                  key={item.id}
                  item={item}
                  posicion={items.length - idx}
                  onVerComprobante={onVerComprobante}
                  onDeshacer={onDeshacer}
                  disabled={accionDeshabilitada}
                />
              ))}
            </ol>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
