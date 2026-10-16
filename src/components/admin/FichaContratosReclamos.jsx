import { useEffect, useState } from 'react'
import { listarContratosYReclamos } from '../../services/fichaRelacionadosService'
import { ReclamoEstadoChip } from './ReclamoChips'
import { badgeClass, calloutClass, eyebrow } from '../../utils/ui'

const ESTADO_CONTRATO = {
  activo: { label: 'Activo', className: badgeClass('success') },
  programado: { label: 'Programado', className: badgeClass('warning') },
  inactivo: { label: 'Finalizado', className: badgeClass('neutral') },
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
  return <h3 className={`${eyebrow} mb-2.5`}>{children}</h3>
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

  if (error) return <p className={calloutClass('danger')}>{error}</p>
  if (!datos) return <p className="text-sm text-slate-500">Cargando contratos y reclamos…</p>

  const contraparte = (fila) =>
    porInquilino ? fila.propiedades?.direccion ?? '—' : fila.inquilinos?.nombre_completo ?? '—'

  return (
    <div className="space-y-5">
      <section>
        <Titulo>Contratos ({datos.contratos.length})</Titulo>
        {datos.contratos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin contratos asociados.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {datos.contratos.map((c) => {
              const estado = ESTADO_CONTRATO[c.estado] ?? ESTADO_CONTRATO.inactivo
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{contraparte(c)}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)} · {formatMonto(c.monto_alquiler)}
                    </p>
                  </div>
                  <span className={estado.className}>{estado.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <Titulo>Reclamos ({datos.reclamos.length})</Titulo>
        {datos.reclamos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin reclamos asociados.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {datos.reclamos.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{r.titulo}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatFecha(r.fecha_creacion)} · {contraparte(r)}
                  </p>
                </div>
                <ReclamoEstadoChip estado={r.estado} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
