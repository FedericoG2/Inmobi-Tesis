import { useState } from 'react'
import AdminFormModalHeader from '../admin/AdminFormModalHeader'
import Modal, { ModalBody, ModalFooter } from '../ui/Modal'
import Button from '../ui/Button'
import { IconChevronDown, IconUser } from '../icons/Icons'
import { ROL_LABEL, ROLES_CON_FICHA } from '../../services/cuentasService'
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

const ROLES_ASIGNABLES = ['encargado', 'inquilino', 'propietario']
const ROL_CORTO = { encargado: 'Encargado', inquilino: 'Inquilino', propietario: 'Propietario' }

const tieneFicha = (rol) => ROLES_CON_FICHA.includes(rol)

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
        {ROLES_ASIGNABLES.map((rol) => (
          <button
            key={rol}
            type="button"
            title={ROL_LABEL[rol]}
            onClick={() => onChange(rol)}
            className={segmentedItemClass(value === rol)}
          >
            {ROL_CORTO[rol]}
          </button>
        ))}
      </div>
      <p className={fieldHintClass}>
        {value === 'encargado' && 'Opera la cartera: propiedades, contratos, alquileres, aumentos y reclamos.'}
        {value === 'inquilino' && 'Entra al portal del inquilino con los datos de su ficha.'}
        {value === 'propietario' && 'Entra al portal del propietario a consultar sus propiedades y alquileres.'}
      </p>
    </div>
  )
}

/** Ficha del inquilino o del propietario a la que pertenece la cuenta (solo las que no tienen cuenta). */
function SelectorFicha({ rol, value, onChange, fichas }) {
  const persona = rol === 'propietario' ? 'propietario' : 'inquilino'
  return (
    <div>
      <label htmlFor="cuenta-ficha" className={labelClass}>
        Ficha del {persona}
      </label>
      <div className="relative">
        <select id="cuenta-ficha" required value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          <option value="">Elegí un {persona} sin cuenta</option>
          {fichas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre_completo} · {f.dni_cuit}
            </option>
          ))}
        </select>
        <IconChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
        />
      </div>
      {fichas.length === 0 && (
        <p className={fieldHintClass}>
          Todos los {persona}s cargados ya tienen cuenta. El Encargado de Alquileres debe cargar la ficha primero.
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

export function CrearCuentaModal({ fichasSinCuenta, onClose, onGuardar }) {
  const [form, setForm] = useState({ email: '', password: '', rol: 'encargado', fichaId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fichas = fichasSinCuenta[form.rol] ?? []
  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Al elegir la ficha se propone su email (si el campo está vacío).
  const handleFicha = (fichaId) => {
    const ficha = fichas.find((f) => String(f.id) === String(fichaId))
    setForm((f) => ({ ...f, fichaId, email: f.email || ficha?.email || '' }))
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
      fichaId: tieneFicha(form.rol) ? Number(form.fichaId) : null,
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
      <SelectorRol value={form.rol} onChange={(rol) => setForm((f) => ({ ...f, rol, fichaId: '' }))} />
      {tieneFicha(form.rol) && (
        <SelectorFicha rol={form.rol} value={form.fichaId} onChange={handleFicha} fichas={fichas} />
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

export function EditarCuentaModal({ cuenta, fichasSinCuenta, onClose, onGuardar }) {
  const rolInicial = ROLES_ASIGNABLES.includes(cuenta.rol) ? cuenta.rol : 'encargado'
  const [email, setEmail] = useState(cuenta.email ?? '')
  const [rol, setRol] = useState(rolInicial)
  const [fichaId, setFichaId] = useState(cuenta.ficha?.tipo === rolInicial ? String(cuenta.ficha.id) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // La ficha que ya tiene la cuenta se puede volver a elegir.
  const fichaActual = cuenta.ficha?.tipo === rol ? [cuenta.ficha] : []
  const opciones = [...fichaActual, ...(fichasSinCuenta[rol] ?? [])]
  const pierdePortal = tieneFicha(cuenta.rol) && cuenta.rol !== rol

  const handleRol = (nuevo) => {
    setRol(nuevo)
    setFichaId(cuenta.ficha?.tipo === nuevo ? String(cuenta.ficha.id) : '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const emailLimpio = email.trim().toLowerCase()
    const resultado = await onGuardar({
      userId: cuenta.id,
      email: emailLimpio !== (cuenta.email ?? '').toLowerCase() ? emailLimpio : undefined,
      rol,
      fichaId: tieneFicha(rol) ? Number(fichaId) : null,
    })
    setSubmitting(false)
    if (resultado?.error) setError(resultado.error.message)
  }

  return (
    <ModalBase
      title="Editar cuenta"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Guardar cambios"
      error={error}
    >
      <div>
        <label htmlFor="cuenta-email-editar" className={labelClass}>
          Email de acceso
        </label>
        <input
          id="cuenta-email-editar"
          type="email"
          required
          maxLength={100}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <p className={fieldHintClass}>Si lo cambiás, la persona ingresa con el email nuevo y la misma contraseña.</p>
      </div>
      <SelectorRol value={rol} onChange={handleRol} />
      {tieneFicha(rol) && <SelectorFicha rol={rol} value={fichaId} onChange={setFichaId} fichas={opciones} />}
      {pierdePortal && (
        <p className={calloutClass('warning')}>
          La cuenta deja de estar vinculada a la ficha del {cuenta.rol} y pierde el acceso a su portal.
        </p>
      )}
    </ModalBase>
  )
}

const formatoFechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Nunca'

/** Consulta de una cuenta (CU-061). */
export function DetalleCuentaModal({ cuenta, onClose, onEditar }) {
  const filas = [
    ['Email de acceso', cuenta.email],
    ['Rol', cuenta.rol ? ROL_LABEL[cuenta.rol] : 'Sin rol asignado'],
    ['Estado', cuenta.bloqueado ? 'Bloqueada: no puede iniciar sesión' : 'Activa'],
    [
      'Vinculada a',
      cuenta.ficha
        ? `${cuenta.ficha.tipo === 'propietario' ? 'Propietario' : 'Inquilino'}: ${cuenta.ficha.nombre_completo} (${cuenta.ficha.dni_cuit})`
        : 'Sin ficha vinculada',
    ],
    ['Creada', formatoFechaHora(cuenta.creado)],
    ['Último ingreso', formatoFechaHora(cuenta.ultimo_ingreso)],
  ]
  return (
    <Modal open onClose={onClose} size="lg">
      <AdminFormModalHeader title="Cuenta" icon={<IconUser className="h-5 w-5" />} subtitle={cuenta.email} onClose={onClose} editing={false} />
      <ModalBody>
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {filas.map(([label, valor]) => (
            <div key={label} className="grid grid-cols-1 gap-0.5 px-3.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="break-words text-sm font-medium text-slate-900">{valor}</dd>
            </div>
          ))}
        </dl>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {onEditar && <Button onClick={onEditar}>Editar</Button>}
      </ModalFooter>
    </Modal>
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
