import { useEffect, useMemo, useRef, useState } from 'react'
import { contratosActivosPorInquilino } from '../../../utils/contratoActivo'
import { formatearDniCuit } from '../../../utils/normalizarContacto'
import { IconCheck, IconSearch, IconUsers } from '../../icons/Icons'
import Modal, { ModalHeader } from '../../ui/Modal'
import { cn, inputClass } from '../../../utils/ui'

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

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return inquilinos
    return inquilinos.filter((i) => {
      const nombre = (i.nombre_completo ?? '').toLowerCase()
      const dni = String(i.dni_cuit ?? '').toLowerCase()
      return nombre.includes(q) || dni.includes(q)
    })
  }, [busqueda, inquilinos])

  return (
    <Modal open={open} onClose={onClose} size="md" layer="stacked" labelledBy="inquilino-picker-titulo">
      <ModalHeader titleId="inquilino-picker-titulo" icon={IconUsers} title="Elegir inquilino" onClose={onClose} />

      <div className="border-b border-slate-100 px-5 py-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI/CUIT…"
            className={cn(inputClass, 'pl-9')}
          />
        </div>
      </div>

      <div className="max-h-[50vh] min-h-0 flex-1 overflow-y-auto p-2">
        {resultados.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">No se encontraron inquilinos con ese criterio.</p>
        ) : (
          <ul className="space-y-0.5">
            {resultados.map((i) => {
              const activos = contratosActivosPorInquilino(contratos, i.id)
              const cantidad = activos.length
              const esSeleccionado = String(i.id) === String(selectedId)

              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                      esSeleccionado ? 'bg-brand-50' : 'hover:bg-slate-100'
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/10">
                      {(i.nombre_completo ?? '?')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{i.nombre_completo}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {i.dni_cuit ? `DNI/CUIT ${formatearDniCuit(i.dni_cuit)}` : 'Sin DNI/CUIT'}
                        {cantidad > 1 ? ` · ${cantidad} propiedades` : ''}
                      </span>
                    </span>
                    {esSeleccionado && <IconCheck className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={2} />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
