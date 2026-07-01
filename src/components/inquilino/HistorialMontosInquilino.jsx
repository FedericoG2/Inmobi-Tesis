import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import { portalCardClass } from '../../utils/portalInquilinoUi'

export default function HistorialMontosInquilino({ filas, className = '' }) {
  if (!filas?.length) {
    return (
      <div className={`${portalCardClass} px-5 py-6 text-center ${className}`.trim()}>
        <p className="text-sm font-medium text-slate-700">Sin meses para mostrar</p>
        <p className="mt-1 text-xs text-slate-500">
          Cuando el contrato esté en curso, vas a ver acá el alquiler mes a mes.
        </p>
      </div>
    )
  }

  const filasRecientes = [...filas].reverse()

  return (
    <div className={`${portalCardClass} overflow-hidden ${className}`.trim()}>
      <p className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500 lg:px-5">
        Alquiler mensual vigente en cada mes. No incluye comprobantes de pago.
      </p>

      <ol className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filasRecientes.map((fila) => (
          <li
            key={fila.id}
            className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 lg:flex-col lg:items-start lg:gap-1 lg:py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-xs font-medium text-slate-800 lg:text-sm">{fila.mesLabel}</p>
                {fila.esMesActual && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Actual
                  </span>
                )}
                {fila.huboAumento && (
                  <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200">
                    Aumento
                  </span>
                )}
              </div>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 lg:text-base">
              {formatMontoInquilino(fila.monto)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
