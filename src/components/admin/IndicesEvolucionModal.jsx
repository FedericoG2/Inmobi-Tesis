import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import IpcBarChart from './IpcBarChart'
import { obtenerIpcAnualArgly, obtenerSeriesArgly } from '../../services/arglyService'
import { hoyIsoLocal } from '../../utils/aumentosUi'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function iclMensualDelAnio(serie, anio) {
  const porMes = new Map()
  for (const punto of serie ?? []) {
    if (!punto.fecha?.startsWith(String(anio))) continue
    const mes = Number(punto.fecha.slice(5, 7))
    if (!Number.isFinite(mes)) continue
    porMes.set(mes, punto.valor)
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mes, valor]) => ({
      mes: MESES_CORTOS[mes - 1] ?? String(mes),
      valor,
    }))
}

function IconChart({ className = 'h-5 w-5' }) {
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

export default function IndicesEvolucionModal({ open, onClose }) {
  const [tab, setTab] = useState('ipc')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [ipcAnual, setIpcAnual] = useState([])
  const [iclAnual, setIclAnual] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return

    let activo = true
    const anioActual = new Date().getFullYear()
    const hoy = hoyIsoLocal()

    setTab('ipc')
    setCargando(true)
    setError(null)
    setAnio(anioActual)

    Promise.all([
      obtenerIpcAnualArgly(anioActual),
      obtenerSeriesArgly({
        ipc: null,
        icl: { desde: `${anioActual}-01-01`, hasta: hoy },
      }),
    ]).then(([ipcResult, iclResult]) => {
      if (!activo) return

      const ipc = ipcResult.error ? [] : ipcResult.data?.ipcAnual ?? []
      const icl = iclResult.error ? [] : iclMensualDelAnio(iclResult.data?.icl, anioActual)
      setIpcAnual(ipc)
      setIclAnual(icl)

      const mensaje = ipcResult.error?.message ?? iclResult.error?.message ?? null
      if (ipc.length === 0 && icl.length === 0) {
        setError(mensaje ?? 'No se pudieron cargar los índices.')
      } else {
        setError(null)
      }
      setCargando(false)
    })

    return () => {
      activo = false
    }
  }, [open])

  if (!open) return null

  const esIpc = tab === 'ipc'
  const serie = esIpc ? ipcAnual : iclAnual
  const ultimoMes = serie.at(-1)?.mes

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar evolución de índices"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="indices-evolucion-titulo"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <IconChart />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="indices-evolucion-titulo" className="truncate text-base font-semibold text-slate-900">
                Evolución de índices
              </h2>
              <p className="truncate text-sm text-slate-600">
                {esIpc ? `Variación mensual IPC ${anio}` : `ICL mensual ${anio}`}
                {ultimoMes ? ` · hasta ${ultimoMes}` : ''} · Fuente Argly
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <div
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white p-1"
            role="tablist"
            aria-label="Índice a visualizar"
          >
            {[
              { value: 'ipc', label: 'IPC' },
              { value: 'icl', label: 'ICL' },
            ].map(({ value, label }) => {
              const activo = tab === value
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setTab(value)}
                  className={`inline-flex h-full items-center rounded-md px-3 text-xs font-medium transition-colors ${
                    activo
                      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-[18rem] px-4 py-4 sm:px-6">
          {cargando ? (
            <p className="py-16 text-center text-sm text-slate-500">Cargando índices…</p>
          ) : error && serie.length === 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : serie.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Sin datos de {esIpc ? 'IPC' : 'ICL'} para {anio}.
            </p>
          ) : (
            <IpcBarChart data={serie} height={280} unidad={esIpc ? '%' : ''} />
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
