import { useEffect, useMemo, useState } from 'react'
import { Button } from '@tremor/react'
import { listarHistorialGlobalAumentos } from '../../services/aumentosService'
import {
  capitalizar,
  chipIndicador,
  claveMes,
  formatPeriodoMesAnio,
  MESES_LARGOS,
} from '../../utils/aumentosUi'

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

function etiquetaPeriodo(clave) {
  const [anio, mes] = clave.split('-').map(Number)
  return `${capitalizar(MESES_LARGOS[mes - 1] ?? String(mes))} ${anio}`
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
  return aplicado ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
      Aplicado
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
      Acordado
    </span>
  )
}

const selectClass =
  'h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export default function AumentosHistorialGlobalModal({
  open,
  onClose,
  onVerComprobante,
  onDeshacer,
  accionDeshabilitada = false,
  reloadToken = 0,
}) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState('todos')
  const [indice, setIndice] = useState('todos')
  const [estado, setEstado] = useState('todos')

  useEffect(() => {
    if (!open) return

    let activo = true
    setCargando(true)
    setError(null)

    listarHistorialGlobalAumentos().then(({ data, error: err }) => {
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
  }, [open, reloadToken])

  const periodosDisponibles = useMemo(() => {
    const claves = new Set(items.map((i) => claveMes(i.fecha_aplicacion)).filter(Boolean))
    return Array.from(claves).sort((a, b) => b.localeCompare(a))
  }, [items])

  const itemsFiltrados = useMemo(() => {
    return items.filter((i) => {
      if (periodo !== 'todos' && claveMes(i.fecha_aplicacion) !== periodo) return false
      if (indice !== 'todos' && (i.indice_tipo ?? '').toLowerCase() !== indice) return false
      if (estado === 'aplicado' && !i.aplicado) return false
      if (estado === 'acordado' && i.aplicado) return false
      return true
    })
  }, [items, periodo, indice, estado])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar historial global"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aumentos-historial-global-titulo"
        className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <IconHistory />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="aumentos-historial-global-titulo"
                className="truncate text-base font-semibold text-slate-900"
              >
                Historial de aumentos
              </h2>
              <p className="truncate text-sm text-slate-600">
                Todos los aumentos registrados, filtrables por período.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Período
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className={selectClass}
            >
              <option value="todos">Todos</option>
              {periodosDisponibles.map((clave) => (
                <option key={clave} value={clave}>
                  {etiquetaPeriodo(clave)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Índice
            <select value={indice} onChange={(e) => setIndice(e.target.value)} className={selectClass}>
              <option value="todos">Todos</option>
              <option value="icl">ICL</option>
              <option value="ipc">IPC</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectClass}>
              <option value="todos">Todos</option>
              <option value="aplicado">Aplicado</option>
              <option value="acordado">Acordado</option>
            </select>
          </label>
          <span className="ml-auto text-xs text-slate-500">
            {cargando ? 'Cargando…' : `${itemsFiltrados.length} aumento(s)`}
          </span>
        </div>

        <div className="overflow-auto px-2 py-2">
          {cargando ? (
            <p className="py-10 text-center text-sm text-slate-500">Cargando historial…</p>
          ) : error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="m-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">Sin aumentos para los filtros elegidos</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-medium">Contrato</th>
                  <th className="px-3 py-2 text-left font-medium">Período</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 text-center font-medium">Índice</th>
                  <th className="px-3 py-2 text-center font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsFiltrados.map((item) => {
                  const indicador = chipIndicador(item.indice_tipo)
                  const pct = formatPct(item.porcentaje_aplicado)
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {item.inquilino_nombre ?? '—'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.propiedad_direccion ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                        {formatPeriodoMesAnio(item.fecha_aplicacion)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-slate-400 line-through">
                            {formatMonto(item.monto_anterior)}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatMonto(item.monto_nuevo)}
                          </span>
                          {pct && (
                            <span className="text-[11px] font-medium text-emerald-600">(+{pct})</span>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {MODO_LABEL[item.modo] ?? item.modo}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                          <span className="text-sm leading-none">{indicador.icon}</span>
                          {indicador.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <EstadoTag aplicado={item.aplicado} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {onVerComprobante && (
                            <button
                              type="button"
                              title="Ver comprobante"
                              onClick={() => onVerComprobante(item)}
                              disabled={accionDeshabilitada}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                            >
                              <IconReceipt className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDeshacer && (
                            <button
                              type="button"
                              title="Deshacer aumento"
                              onClick={() => onDeshacer(item)}
                              disabled={accionDeshabilitada}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                            >
                              <IconUndo className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
