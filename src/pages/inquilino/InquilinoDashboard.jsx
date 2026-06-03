import { alquilerInquilino } from '../../data/mockData'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)

export default function InquilinoDashboard() {
  const { direccion, diasRestantes, montoMensual, reclamosActivos } = alquilerInquilino

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Mi Alquiler</h2>

      <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-100">
        <div className="bg-indigo-600 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
            Propiedad actual
          </p>
          <p className="mt-1 text-base font-semibold text-white">{direccion}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Días restantes</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">{diasRestantes}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Monto mensual</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{formatMonto(montoMensual)}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Reclamos activos</p>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
              {reclamosActivos}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
