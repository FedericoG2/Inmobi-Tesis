import { useEffect, useState } from 'react'
import { listarContratosYReclamos } from '../../services/fichaRelacionadosService'
import { ReclamoEstadoChip } from './ReclamoChips'

const ESTADO_CONTRATO = {
  activo: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  programado: { label: 'Programado', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  inactivo: { label: 'Finalizado', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const formatMonto = (monto) =>
  monto == null
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
        Number(monto)
      )

function Titulo({ children }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
}

/**
 * Listado de contratos y reclamos asociados. Con `inquilinoId` muestra la propiedad de cada uno;
 * con `propiedadId`, el inquilino.
 */
export default function FichaContratosReclamos({ inquilinoId = null, propiedadId = null }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const porInquilino = inquilinoId != null

  useEffect(() => {
    if (inquilinoId == null && propiedadId == null) return undefined
    let activo = true
    setDatos(null)
    setError(null)
    listarContratosYReclamos({ inquilinoId, propiedadId }).then(({ data, error: err }) => {
      if (!activo) return
      if (err) setError('No se pudieron cargar los contratos y reclamos.')
      else setDatos(data)
    })
    return () => {
      activo = false
    }
  }, [inquilinoId, propiedadId])

  if (error) return <p className="text-xs font-medium text-red-600">{error}</p>
  if (!datos) return <p className="text-xs text-slate-500">Cargando contratos y reclamos...</p>

  const contraparte = (fila) =>
    porInquilino ? fila.propiedades?.direccion ?? '—' : fila.inquilinos?.nombre_completo ?? '—'

  return (
    <div className="space-y-4">
      <section>
        <Titulo>Contratos ({datos.contratos.length})</Titulo>
        {datos.contratos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin contratos asociados.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {datos.contratos.map((c) => {
              const estado = ESTADO_CONTRATO[c.estado] ?? ESTADO_CONTRATO.inactivo
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{contraparte(c)}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)} · {formatMonto(c.monto_alquiler)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${estado.className}`}
                  >
                    {estado.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <Titulo>Reclamos ({datos.reclamos.length})</Titulo>
        {datos.reclamos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin reclamos asociados.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {datos.reclamos.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{r.titulo}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatFecha(r.fecha_creacion)} · {contraparte(r)}
                  </p>
                </div>
                <ReclamoEstadoChip estado={r.estado} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
