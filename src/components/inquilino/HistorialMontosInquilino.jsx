import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'

export default function HistorialMontosInquilino({ filas, className = '' }) {
  if (!filas?.length) {
    return (
      <div className={`rounded-2xl bg-white px-5 py-6 text-center ring-1 ring-slate-100 ${className}`.trim()}>
        <p className="text-sm font-medium text-slate-700">Sin meses para mostrar</p>
        <p className="mt-1 text-xs text-slate-500">
          Cuando el contrato esté en curso, vas a ver acá el alquiler mes a mes.
        </p>
      </div>
    )
  }

  const filasRecientes = [...filas].reverse()

  return (
    <div className={`rounded-2xl bg-white ring-1 ring-slate-100 ${className}`.trim()}>
      <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
        Alquiler mensual vigente en cada mes. No incluye comprobantes de pago.
      </p>

      <ol className="divide-y divide-slate-100">
        {filasRecientes.map((fila) => (
          <li key={fila.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-800">{fila.mesLabel}</p>
                {fila.esMesActual && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Actual
                  </span>
                )}
                {fila.huboAumento && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                    Aumento
                  </span>
                )}
              </div>
            </div>
            <p className="shrink-0 text-base font-bold text-slate-900">{formatMontoInquilino(fila.monto)}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
