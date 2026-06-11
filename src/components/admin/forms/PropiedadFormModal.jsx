import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { TIPOS_PROPIEDAD, ESTADOS_PROPIEDAD, validarDireccion } from '../../../utils/validaciones'

const formInicial = {
  propietario_id: '',
  direccion: '',
  tipo: 'Departamento',
  estado: 'Disponible',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const inputErrorClass =
  'w-full rounded-lg border border-red-400 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

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
  tieneContratoActivo = false,
}) {
  const [form, setForm] = useState(formInicial)
  const [erroresCampo, setErroresCampo] = useState({})
  const esEdicion = Boolean(propiedad)

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      setErroresCampo({})
      return
    }
    setForm(esEdicion ? formDesdePropiedad(propiedad) : formInicial)
    setErroresCampo({})
  }, [open, propiedad, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (erroresCampo[field]) {
      setErroresCampo((prev) => ({ ...prev, [field]: null }))
    }
  }

  const validar = () => {
    const errores = {}

    if (!form.propietario_id) {
      errores.propietario_id = 'Debe seleccionar un propietario'
    }

    const errDir = validarDireccion(form.direccion)
    if (errDir) errores.direccion = errDir

    return errores
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errores = validar()
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores)
      return
    }

    const ok = await onSubmit({ ...form, direccion: form.direccion.trim() })
    if (ok) onClose()
  }

  const sinPropietarios = !propietariosLoading && propietarios.length === 0
  const formDeshabilitadoCrear = sinPropietarios && !esEdicion
  const estadoBloqueado = tieneContratoActivo && esEdicion

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

        {tieneContratoActivo && esEdicion && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Esta propiedad tiene un contrato activo. El estado está bloqueado. Si cambiás el propietario se pedirá confirmación.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="propietario_id" className="mb-1 block text-sm font-medium text-slate-700">
              Propietario
            </label>
            {propietariosLoading ? (
              <p className="text-sm text-slate-500">Cargando propietarios...</p>
            ) : sinPropietarios ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay propietarios cargados. Creá uno antes de agregar una propiedad.
              </p>
            ) : (
              <select
                id="propietario_id"
                required
                value={form.propietario_id}
                onChange={handleChange('propietario_id')}
                className={erroresCampo.propietario_id ? inputErrorClass : inputClass}
                disabled={formDeshabilitadoCrear}
              >
                <option value="">Seleccioná un propietario</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo}
                  </option>
                ))}
              </select>
            )}
            {erroresCampo.propietario_id && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.propietario_id}</p>
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
              maxLength={200}
              value={form.direccion}
              onChange={handleChange('direccion')}
              className={erroresCampo.direccion ? inputErrorClass : inputClass}
              placeholder="Av. Colón 1200, Alberdi, Córdoba"
              disabled={formDeshabilitadoCrear}
            />
            {erroresCampo.direccion && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.direccion}</p>
            )}
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
              disabled={formDeshabilitadoCrear}
            >
              {TIPOS_PROPIEDAD.map((tipo) => (
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
              disabled={formDeshabilitadoCrear || estadoBloqueado}
            >
              {ESTADOS_PROPIEDAD.map((estado) => (
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
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || formDeshabilitadoCrear}
            >
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
