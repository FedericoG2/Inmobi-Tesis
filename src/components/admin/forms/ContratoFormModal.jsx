import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'

const formInicial = {
  inquilino_id: '',
  propiedad_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  monto_alquiler: '',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function ContratoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  inquilinos,
  inquilinosLoading,
  propiedades,
  propiedadesLoading,
}) {
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    if (!open) setForm(formInicial)
  }, [open])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onClose()
  }

  const sinInquilinos = !inquilinosLoading && inquilinos.length === 0
  const sinPropiedades = !propiedadesLoading && propiedades.length === 0
  const formDeshabilitado = sinInquilinos || sinPropiedades

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Agregar contrato</h2>
        <p className="mt-1 text-sm text-slate-500">Vinculá un inquilino con una propiedad</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="inquilino_id" className="mb-1 block text-sm font-medium text-slate-700">
              Inquilino
            </label>
            {inquilinosLoading ? (
              <p className="text-sm text-slate-500">Cargando inquilinos...</p>
            ) : sinInquilinos ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay inquilinos cargados. Creá uno antes de agregar un contrato.
              </p>
            ) : (
              <select
                id="inquilino_id"
                required
                value={form.inquilino_id}
                onChange={handleChange('inquilino_id')}
                className={inputClass}
              >
                <option value="">Seleccioná un inquilino</option>
                {inquilinos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre_completo}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="propiedad_id" className="mb-1 block text-sm font-medium text-slate-700">
              Propiedad
            </label>
            {propiedadesLoading ? (
              <p className="text-sm text-slate-500">Cargando propiedades...</p>
            ) : sinPropiedades ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay propiedades cargadas. Creá una antes de agregar un contrato.
              </p>
            ) : (
              <select
                id="propiedad_id"
                required
                value={form.propiedad_id}
                onChange={handleChange('propiedad_id')}
                className={inputClass}
                disabled={formDeshabilitado}
              >
                <option value="">Seleccioná una propiedad</option>
                {propiedades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.direccion}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha_inicio" className="mb-1 block text-sm font-medium text-slate-700">
                Fecha inicio
              </label>
              <input
                id="fecha_inicio"
                type="date"
                required
                value={form.fecha_inicio}
                onChange={handleChange('fecha_inicio')}
                className={inputClass}
                disabled={formDeshabilitado}
              />
            </div>

            <div>
              <label htmlFor="fecha_fin" className="mb-1 block text-sm font-medium text-slate-700">
                Fecha fin
              </label>
              <input
                id="fecha_fin"
                type="date"
                required
                value={form.fecha_fin}
                onChange={handleChange('fecha_fin')}
                className={inputClass}
                disabled={formDeshabilitado}
              />
            </div>
          </div>

          <div>
            <label htmlFor="monto_alquiler" className="mb-1 block text-sm font-medium text-slate-700">
              Monto alquiler
            </label>
            <input
              id="monto_alquiler"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.monto_alquiler}
              onChange={handleChange('monto_alquiler')}
              className={inputClass}
              placeholder="300000"
              disabled={formDeshabilitado}
            />
          </div>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting || formDeshabilitado}>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
