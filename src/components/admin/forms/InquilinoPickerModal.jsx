import { useEffect, useMemo, useRef, useState } from 'react'
import { contratosActivosPorInquilino } from '../../../utils/contratoActivo'
import { formatearDniCuit } from '../../../utils/normalizarContacto'

function IconSearch({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}

export default function InquilinoPickerModal({
  open,
  onClose,
  onSelect,
  inquilinos,
  contratos,
  selectedId,
}) {
  const [busqueda, setBusqueda] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setBusqueda('')
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return inquilinos
    return inquilinos.filter((i) => {
      const nombre = (i.nombre_completo ?? '').toLowerCase()
      const dni = String(i.dni_cuit ?? '').toLowerCase()
      return nombre.includes(q) || dni.includes(q)
    })
  }, [busqueda, inquilinos])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <button
        type="button"
        aria-label="Cerrar selector de inquilino"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-brand-600 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Elegir Inquilino</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-brand-100 transition hover:bg-brand-500 hover:text-white"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o DNI/CUIT..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
          {resultados.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              No se encontraron inquilinos con ese criterio.
            </p>
          ) : (
            <ul className="space-y-1">
              {resultados.map((i) => {
                const activos = contratosActivosPorInquilino(contratos, i.id)
                const cantidad = activos.length
                const esSeleccionado = String(i.id) === String(selectedId)

                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        esSeleccionado
                          ? 'bg-brand-50 ring-1 ring-brand-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {(i.nombre_completo ?? '?')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {i.nombre_completo}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {i.dni_cuit ? `DNI/CUIT ${formatearDniCuit(i.dni_cuit)}` : 'Sin DNI/CUIT'}
                          {cantidad > 1 ? ` · ${cantidad} propiedades` : ''}
                        </span>
                      </span>
                      {esSeleccionado && (
                        <svg
                          className="h-5 w-5 shrink-0 text-brand-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
