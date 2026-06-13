import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import {
  validarNombreCompleto,
  validarDniCuit,
  validarTelefono,
  validarEmail,
} from '../../../utils/validaciones'

const formInicial = {
  nombre_completo: '',
  dni_cuit: '',
  telefono: '',
  email: '',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const inputErrorClass =
  'w-full rounded-lg border border-red-400 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

function formDesdePropietario(propietario) {
  return {
    nombre_completo: propietario.nombre_completo ?? '',
    dni_cuit: propietario.dni_cuit ?? '',
    telefono: propietario.telefono ?? '',
    email: propietario.email ?? '',
  }
}

function validarForm(form) {
  return {
    nombre_completo: validarNombreCompleto(form.nombre_completo),
    dni_cuit: validarDniCuit(form.dni_cuit),
    telefono: validarTelefono(form.telefono),
    email: validarEmail(form.email),
  }
}

export default function PropietarioFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  propietario = null,
}) {
  const [form, setForm] = useState(formInicial)
  const [erroresCampo, setErroresCampo] = useState({})
  const esEdicion = Boolean(propietario)

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      setErroresCampo({})
      return
    }
    setForm(esEdicion ? formDesdePropietario(propietario) : formInicial)
    setErroresCampo({})
  }, [open, propietario, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (erroresCampo[field]) {
      setErroresCampo((prev) => ({ ...prev, [field]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errores = validarForm(form)
    const hayErrores = Object.values(errores).some(Boolean)
    if (hayErrores) {
      setErroresCampo(errores)
      return
    }

    const ok = await onSubmit({
      nombre_completo: form.nombre_completo.trim(),
      dni_cuit: form.dni_cuit.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim().toLowerCase(),
    })
    if (ok) onClose()
  }

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
          {esEdicion ? 'Editar propietario' : 'Agregar propietario'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? 'Modificá los datos del propietario'
            : 'Completá los datos del nuevo propietario'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nombre_completo" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre completo
            </label>
            <input
              id="nombre_completo"
              type="text"
              required
              maxLength={100}
              value={form.nombre_completo}
              onChange={handleChange('nombre_completo')}
              className={erroresCampo.nombre_completo ? inputErrorClass : inputClass}
              placeholder="Juan Carlos Zitelli"
            />
            {erroresCampo.nombre_completo && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.nombre_completo}</p>
            )}
          </div>

          <div>
            <label htmlFor="dni_cuit" className="mb-1 block text-sm font-medium text-slate-700">
              DNI / CUIT
            </label>
            <input
              id="dni_cuit"
              type="text"
              required
              maxLength={14}
              value={form.dni_cuit}
              onChange={handleChange('dni_cuit')}
              className={erroresCampo.dni_cuit ? inputErrorClass : inputClass}
              placeholder="20-12345678-9"
            />
            {erroresCampo.dni_cuit && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.dni_cuit}</p>
            )}
          </div>

          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              id="telefono"
              type="text"
              required
              maxLength={20}
              value={form.telefono}
              onChange={handleChange('telefono')}
              className={erroresCampo.telefono ? inputErrorClass : inputClass}
              placeholder="3516554433"
            />
            {erroresCampo.telefono && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.telefono}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="text"
              required
              maxLength={100}
              value={form.email}
              onChange={handleChange('email')}
              className={erroresCampo.email ? inputErrorClass : inputClass}
              placeholder="nombre@email.com"
            />
            {erroresCampo.email && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.email}</p>
            )}
          </div>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
