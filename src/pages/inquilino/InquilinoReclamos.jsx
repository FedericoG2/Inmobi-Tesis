import { useState } from 'react'
import { reclamosInquilino as reclamosIniciales } from '../../data/mockData'

const estadoStyles = {
  Pendiente: 'bg-amber-100 text-amber-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  Resuelto: 'bg-emerald-100 text-emerald-700',
}

export default function InquilinoReclamos() {
  const [reclamos] = useState(reclamosIniciales)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="relative space-y-4 pb-4">
      <h2 className="text-lg font-bold text-slate-800">Mis Reclamos</h2>

      <ul className="space-y-3">
        {reclamos.map((r) => (
          <li
            key={r.id}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{r.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-400">{r.fecha}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[r.estado]}`}
              >
                {r.estado}
              </span>
            </div>

            {r.estado === 'Pendiente' && (
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-indigo-200 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
              >
                Editar
              </button>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-24">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6">
            <h3 className="text-lg font-bold text-slate-800">Nuevo Reclamo</h3>
            <p className="mt-1 text-sm text-slate-500">Formulario mock — conectar con Supabase</p>
            <textarea
              className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
              rows={4}
              placeholder="Describí el problema..."
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowForm(true)}
        aria-label="Nuevo reclamo"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-light text-white shadow-lg transition hover:bg-indigo-700 active:scale-95"
      >
        +
      </button>
    </div>
  )
}
