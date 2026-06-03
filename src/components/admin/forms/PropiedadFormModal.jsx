import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'

const tipos = ['Departamento', 'Casa', 'Local comercial']
const estados = ['Disponible', 'Alquilada', 'Mantenimiento']

const formInicial = {
  propietario_id: '',
  direccion: '',
  tipo: 'Departamento',
  estado: 'Disponible',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

function formDesdePropiedad(propiedad) {
  return {
    propietario_id: propiedad.propietario_id != null ? String(propiedad.propietario_id) : '',
    direccion: propiedad.direccion ?? '',
    tipo: propiedad.tipo ?? 'Departamento',
    estado: propiedad.estado ?? 'Disponible',
  }
}

export default function PropiedadFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  propiedad = null,
  propietarios,
  propietariosLoading,
}) {
  const [form, setForm] = useState(formInicial)
  const esEdicion = Boolean(propiedad)

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      return
    }
    setForm(esEdicion ? formDesdePropiedad(propiedad) : formInicial)
  }, [open, propiedad, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onClose()
  }

  const sinPropietarios = !propietariosLoading && propietarios.length === 0
  const formDeshabilitadoCrear = sinPropietarios
  const formDeshabilitado = esEdicion ? false : formDeshabilitadoCrear

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {esEdicion ? 'Editar propiedad' : 'Agregar propiedad'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? 'Modificá los datos de la propiedad'
            : 'Completá los datos de la nueva propiedad'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="propietario_id" className="mb-1 block text-sm font-medium text-slate-700">
              Propietario
            </label>
            {propietariosLoading ? (
              <p className="text-sm text-slate-500">Cargando propietarios...</p>
            ) : sinPropietarios && !esEdicion ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay propietarios cargados. Creá uno antes de agregar una propiedad.
              </p>
            ) : (
              <select
                id="propietario_id"
                required={!esEdicion}
                value={form.propietario_id}
                onChange={handleChange('propietario_id')}
                className={inputClass}
                disabled={formDeshabilitado}
              >
                {esEdicion && <option value="">Ninguno</option>}
                {!esEdicion && <option value="">Seleccioná un propietario</option>}
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="direccion" className="mb-1 block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <input
              id="direccion"
              type="text"
              required
              value={form.direccion}
              onChange={handleChange('direccion')}
              className={inputClass}
              placeholder="Av. Colón 1200, Alberdi, Córdoba"
              disabled={formDeshabilitado}
            />
          </div>

          <div>
            <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-slate-700">
              Tipo
            </label>
            <select
              id="tipo"
              required
              value={form.tipo}
              onChange={handleChange('tipo')}
              className={inputClass}
              disabled={formDeshabilitado}
            >
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="estado" className="mb-1 block text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              id="estado"
              required
              value={form.estado}
              onChange={handleChange('estado')}
              className={inputClass}
              disabled={formDeshabilitado}
            >
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting || formDeshabilitado}>
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
