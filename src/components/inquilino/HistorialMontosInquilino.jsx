import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import { portalCardClass } from '../../utils/portalInquilinoUi'
import Badge from '../ui/Badge'

export default function HistorialMontosInquilino({ filas, className = '' }) {
  if (!filas?.length) {
    return (
      <div className={`${portalCardClass} px-5 py-8 text-center ${className}`.trim()}>
        <p className="text-sm font-medium text-slate-700">Sin meses para mostrar</p>
        <p className="mt-1 text-sm text-slate-500">
          Cuando el contrato esté en curso, vas a ver acá el alquiler mes a mes.
        </p>
      </div>
    )
  }

  const filasRecientes = [...filas].reverse()

  return (
    <div className={`${portalCardClass} overflow-hidden ${className}`.trim()}>
      <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500 lg:px-5">
        Alquiler mensual vigente en cada mes. No incluye comprobantes de pago.
      </p>

      <ol className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filasRecientes.map((fila) => (
          <li
            key={fila.id}
            className="flex items-center justify-between gap-2 bg-white px-4 py-3 lg:flex-col lg:items-start lg:gap-1.5"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <p className="text-sm text-slate-600">{fila.mesLabel}</p>
              {fila.esMesActual && <Badge tone="success">Actual</Badge>}
              {fila.huboAumento && <Badge tone="brand">Aumento</Badge>}
            </div>
            <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
              {formatMontoInquilino(fila.monto)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
