import { useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from '../admin/AdminFormModalHeader'
import { ROL_LABEL } from '../../services/cuentasService'

const MIN_PASSWORD = 8

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

function ModalBase({ title, onClose, onSubmit, submitting, submitLabel, error, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <AdminFormModalHeader title={title} />
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {children}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SelectorRol({ value, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700">Rol</span>
      <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        {['encargado', 'inquilino'].map((rol) => (
          <button
            key={rol}
            type="button"
            onClick={() => onChange(rol)}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
              value === rol ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
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
      <label htmlFor="cuenta-inquilino" className="mb-1 block text-sm font-medium text-slate-700">
        Ficha del inquilino
      </label>
      <select
        id="cuenta-inquilino"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Elegí un inquilino sin cuenta</option>
        {inquilinos.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre_completo} · {i.dni_cuit}
          </option>
        ))}
      </select>
      {inquilinos.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Todos los inquilinos cargados ya tienen cuenta. El Encargado de Alquileres debe cargar la ficha primero.
        </p>
      )}
    </div>
  )
}

function CampoPassword({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
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
      <p className="mt-1 text-xs text-slate-500">Comunicásela al usuario por un canal seguro.</p>
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
        <label htmlFor="cuenta-email" className="mb-1 block text-sm font-medium text-slate-700">
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
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
