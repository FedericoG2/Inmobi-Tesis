import { useEffect, useState } from 'react'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import AdminFormModalHeader from '../AdminFormModalHeader'
import {
  validarNombreCompleto,
  validarDniCuit,
  validarTelefono,
  validarEmail,
  validarDireccion,
} from '../../../utils/validaciones'
import {
  calloutClass,
  fieldErrorClass,
  inputClass,
  inputErrorClass,
  labelClass,
  modalFooterClass,
  modalFormClass,
  segmentedClass,
  segmentedItemClass,
} from '../../../utils/ui'

const formInicial = {
  tipo_persona: 'Física',
  nombre_completo: '',
  dni_cuit: '',
  telefono: '',
  email: '',
  domicilio: '',
}

function formDesdePropietario(propietario) {
  return {
    tipo_persona: propietario.tipo_persona ?? 'Física',
    nombre_completo: propietario.nombre_completo ?? '',
    dni_cuit: propietario.dni_cuit ?? '',
    telefono: propietario.telefono ?? '',
    email: propietario.email ?? '',
    domicilio: propietario.domicilio ?? '',
  }
}

function validarForm(form) {
  return {
    nombre_completo: validarNombreCompleto(form.nombre_completo),
    dni_cuit: validarDniCuit(form.dni_cuit),
    telefono: validarTelefono(form.telefono),
    email: validarEmail(form.email),
    domicilio: validarDireccion(form.domicilio),
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
  const esJuridica = form.tipo_persona === 'Jurídica'

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

  const handleTipoPersona = (tipo) => {
    setForm((prev) => ({ ...prev, tipo_persona: tipo }))
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
      tipo_persona: form.tipo_persona,
      nombre_completo: form.nombre_completo.trim(),
      dni_cuit: form.dni_cuit.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim().toLowerCase(),
      domicilio: form.domicilio.trim(),
    })
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={submitting ? undefined : onClose} size="lg">
      <AdminFormModalHeader title={esEdicion ? 'Editar propietario' : 'Nuevo propietario'} onClose={submitting ? undefined : onClose} />

      <form onSubmit={handleSubmit} className={modalFormClass}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <span className={labelClass}>Tipo de persona</span>
            <div className={segmentedClass}>
              {['Física', 'Jurídica'].map((tipo) => {
                const activo = form.tipo_persona === tipo
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleTipoPersona(tipo)}
                    className={segmentedItemClass(activo)}
                  >
                    {tipo === 'Física' ? 'Persona física' : 'Persona jurídica'}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="nombre_completo" className={labelClass}>
              {esJuridica ? 'Razón social' : 'Nombre completo'}
            </label>
            <input
              id="nombre_completo"
              type="text"
              required
              maxLength={100}
              value={form.nombre_completo}
              onChange={handleChange('nombre_completo')}
              className={erroresCampo.nombre_completo ? inputErrorClass : inputClass}
              placeholder={esJuridica ? 'Inversiones del Sur S.A.' : 'María Elena Rodríguez'}
            />
            {erroresCampo.nombre_completo && (
              <p className={fieldErrorClass}>{erroresCampo.nombre_completo}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dni_cuit" className={labelClass}>
                {esJuridica ? 'CUIT' : 'DNI / CUIT'}
              </label>
              <input
                id="dni_cuit"
                type="text"
                required
                maxLength={14}
                value={form.dni_cuit}
                onChange={handleChange('dni_cuit')}
                className={erroresCampo.dni_cuit ? inputErrorClass : inputClass}
                placeholder={esJuridica ? '30-70894561-2' : '27-30123456-8'}
              />
              {erroresCampo.dni_cuit && (
                <p className={fieldErrorClass}>{erroresCampo.dni_cuit}</p>
              )}
            </div>

            <div>
              <label htmlFor="telefono" className={labelClass}>
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
                placeholder="351 456 7890"
              />
              {erroresCampo.telefono && (
                <p className={fieldErrorClass}>{erroresCampo.telefono}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
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
              <p className={fieldErrorClass}>{erroresCampo.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="domicilio" className={labelClass}>
              Domicilio
            </label>
            <input
              id="domicilio"
              type="text"
              required
              maxLength={200}
              value={form.domicilio}
              onChange={handleChange('domicilio')}
              className={erroresCampo.domicilio ? inputErrorClass : inputClass}
              placeholder="Av. Colón 1820, Córdoba"
            />
            {erroresCampo.domicilio && (
              <p className={fieldErrorClass}>{erroresCampo.domicilio}</p>
            )}
          </div>

          {submitError && (
            <p className={calloutClass('danger')}>{submitError}</p>
          )}
        </div>

        <div className={modalFooterClass}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} disabled={submitting}>
            {esEdicion ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
