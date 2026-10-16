import { useState } from 'react'
import AdminFormModalHeader from '../admin/AdminFormModalHeader'
import Modal, { ModalBody, ModalFooter } from '../ui/Modal'
import Button from '../ui/Button'
import { IconChevronDown, IconUser } from '../icons/Icons'
import { ROL_LABEL } from '../../services/cuentasService'
import {
  calloutClass,
  fieldHintClass,
  inputClass,
  labelClass,
  modalFormClass,
  segmentedClass,
  segmentedItemClass,
  selectClass,
} from '../../utils/ui'

const MIN_PASSWORD = 8

function ModalBase({ title, onClose, onSubmit, submitting, submitLabel, error, children }) {
  return (
    <Modal open onClose={submitting ? undefined : onClose} size="lg">
      <AdminFormModalHeader
        title={title}
        icon={<IconUser className="h-5 w-5" />}
        onClose={submitting ? undefined : onClose}
      />
      <form onSubmit={onSubmit} className={modalFormClass}>
        <ModalBody className="space-y-4">
          {children}
          {error && <p className={calloutClass('danger')}>{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

function SelectorRol({ value, onChange }) {
  return (
    <div>
      <span className={labelClass}>Rol</span>
      <div className={segmentedClass}>
        {['encargado', 'inquilino'].map((rol) => (
          <button key={rol} type="button" onClick={() => onChange(rol)} className={segmentedItemClass(value === rol)}>
            {ROL_LABEL[rol]}
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectorInquilino({ value, onChange, inquilinos }) {
  return (
    <div>
      <label htmlFor="cuenta-inquilino" className={labelClass}>
        Ficha del inquilino
      </label>
      <div className="relative">
        <select
          id="cuenta-inquilino"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Elegí un inquilino sin cuenta</option>
          {inquilinos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre_completo} · {i.dni_cuit}
            </option>
          ))}
        </select>
        <IconChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
        />
      </div>
      {inquilinos.length === 0 && (
        <p className={fieldHintClass}>
          Todos los inquilinos cargados ya tienen cuenta. El Encargado de Alquileres debe cargar la ficha primero.
        </p>
      )}
    </div>
  )
}

function CampoPassword({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        required
        minLength={MIN_PASSWORD}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
      />
      <p className={fieldHintClass}>Comunicásela al usuario por un canal seguro.</p>
    </div>
  )
}

export function CrearCuentaModal({ inquilinosSinCuenta, onClose, onGuardar }) {
  const [form, setForm] = useState({ email: '', password: '', rol: 'encargado', inquilinoId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const handleRol = (rol) => {
    const ficha = inquilinosSinCuenta.find((i) => String(i.id) === String(form.inquilinoId))
    setForm((f) => ({ ...f, rol, inquilinoId: rol === 'inquilino' ? f.inquilinoId : '', email: f.email || ficha?.email || '' }))
  }

  const handleInquilino = (inquilinoId) => {
    const ficha = inquilinosSinCuenta.find((i) => String(i.id) === String(inquilinoId))
    setForm((f) => ({ ...f, inquilinoId, email: f.email || ficha?.email || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }
    setSubmitting(true)
    setError('')
    const resultado = await onGuardar({
      email: form.email.trim(),
      password: form.password,
      rol: form.rol,
      inquilinoId: form.rol === 'inquilino' ? Number(form.inquilinoId) : null,
    })
    setSubmitting(false)
    if (resultado?.error) setError(resultado.error.message)
  }

  return (
    <ModalBase
      title="Nueva cuenta"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Crear cuenta"
      error={error}
    >
      <SelectorRol value={form.rol} onChange={handleRol} />
      {form.rol === 'inquilino' && (
        <SelectorInquilino value={form.inquilinoId} onChange={handleInquilino} inquilinos={inquilinosSinCuenta} />
      )}
      <div>
        <label htmlFor="cuenta-email" className={labelClass}>
          Email de acceso
        </label>
        <input
          id="cuenta-email"
          type="email"
          required
          maxLength={100}
          value={form.email}
          onChange={(e) => set('email')(e.target.value)}
          className={inputClass}
          placeholder="nombre@email.com"
        />
      </div>
      <CampoPassword id="cuenta-password" label="Contraseña inicial" value={form.password} onChange={set('password')} />
    </ModalBase>
  )
}

export function CambiarRolModal({ cuenta, inquilinosSinCuenta, onClose, onGuardar }) {
  const [rol, setRol] = useState(cuenta.rol === 'inquilino' ? 'inquilino' : 'encargado')
  const [inquilinoId, setInquilinoId] = useState(cuenta.inquilino?.id ? String(cuenta.inquilino.id) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const opcionesInquilino = cuenta.inquilino
    ? [{ ...cuenta.inquilino }, ...inquilinosSinCuenta]
    : inquilinosSinCuenta

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const resultado = await onGuardar({
      userId: cuenta.id,
      rol,
      inquilinoId: rol === 'inquilino' ? Number(inquilinoId) : null,
    })
    setSubmitting(false)
    if (resultado?.error) setError(resultado.error.message)
  }

  return (
    <ModalBase
      title="Asignar rol"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Guardar rol"
      error={error}
    >
      <p className="text-sm text-slate-600">
        Cuenta: <span className="font-medium text-slate-900">{cuenta.email}</span>
      </p>
      <SelectorRol value={rol} onChange={setRol} />
      {rol === 'inquilino' && (
        <SelectorInquilino value={inquilinoId} onChange={setInquilinoId} inquilinos={opcionesInquilino} />
      )}
      {cuenta.rol === 'inquilino' && rol === 'encargado' && (
        <p className={calloutClass('warning')}>
          La cuenta deja de estar vinculada a la ficha del inquilino y pierde el acceso al portal.
        </p>
      )}
    </ModalBase>
  )
}

export function RestablecerPasswordModal({ cuenta, onClose, onGuardar }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }
    setSubmitting(true)
    setError('')
    const resultado = await onGuardar({ userId: cuenta.id, password })
    setSubmitting(false)
    if (resultado?.error) setError(resultado.error.message)
  }

  return (
    <ModalBase
      title="Restablecer contraseña"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Restablecer"
      error={error}
    >
      <p className="text-sm text-slate-600">
        Cuenta: <span className="font-medium text-slate-900">{cuenta.email}</span>
      </p>
      <CampoPassword id="cuenta-password-nueva" label="Nueva contraseña" value={password} onChange={setPassword} />
    </ModalBase>
  )
}
