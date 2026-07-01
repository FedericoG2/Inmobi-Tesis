import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from '../AdminFormModalHeader'
import {
  validarNombreCompleto,
  validarDniCuit,
  validarTelefono,
  validarEmailOpcional,
  validarTelefonoOpcional,
  validarTextoOpcional,
} from '../../../utils/validaciones'

const formInicial = {
  tipo_persona: 'Física',
  nombre_completo: '',
  dni_cuit: '',
  telefono: '',
  email: '',
  fecha_nacimiento: '',
  estado_civil: '',
  ocupacion: '',
  emergencia_nombre: '',
  emergencia_telefono: '',
  observaciones: '',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400'

const inputErrorClass =
  'w-full rounded-lg border border-red-400 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-slate-400'

const inputBloqueadoClass =
  'w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'

function LabelCampo({ htmlFor, obligatorio = false, children }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
      {children}
      {obligatorio && <span className="text-red-500"> *</span>}
    </label>
  )
}

function formDesdeInquilino(inquilino) {
  return {
    tipo_persona: inquilino.tipo_persona ?? 'Física',
    nombre_completo: inquilino.nombre_completo ?? '',
    dni_cuit: inquilino.dni_cuit ?? '',
    telefono: inquilino.telefono ?? '',
    email: inquilino.email ?? '',
    fecha_nacimiento: inquilino.fecha_nacimiento ?? '',
    estado_civil: inquilino.estado_civil ?? '',
    ocupacion: inquilino.ocupacion ?? '',
    emergencia_nombre: inquilino.emergencia_nombre ?? '',
    emergencia_telefono: inquilino.emergencia_telefono ?? '',
    observaciones: inquilino.observaciones ?? '',
  }
}

function validarForm(form) {
  return {
    nombre_completo: validarNombreCompleto(form.nombre_completo),
    dni_cuit: validarDniCuit(form.dni_cuit),
    telefono: validarTelefono(form.telefono),
    email: validarEmailOpcional(form.email),
    emergencia_telefono: validarTelefonoOpcional(form.emergencia_telefono),
    observaciones: validarTextoOpcional(form.observaciones, {
      maxLength: 1000,
      etiqueta: 'Las observaciones',
    }),
  }
}

export default function InquilinoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  inquilino = null,
  dependenciasInquilino = null,
}) {
  const [form, setForm] = useState(formInicial)
  const [erroresCampo, setErroresCampo] = useState({})
  const esEdicion = Boolean(inquilino)
  const esJuridica = form.tipo_persona === 'Jurídica'
  const tieneContratoActivo = (dependenciasInquilino?.contratos_activos ?? 0) > 0
  const identidadBloqueada = esEdicion && tieneContratoActivo

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      setErroresCampo({})
      return
    }
    setForm(esEdicion ? formDesdeInquilino(inquilino) : formInicial)
    setErroresCampo({})
  }, [open, inquilino, esEdicion])

  if (!open) return null

  const campoClass = (field) => (erroresCampo[field] ? inputErrorClass : inputClass)
  const campoIdentidadClass = (field) =>
    identidadBloqueada ? inputBloqueadoClass : campoClass(field)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (erroresCampo[field]) {
      setErroresCampo((prev) => ({ ...prev, [field]: null }))
    }
  }

  const handleTipoPersona = (tipo) => {
    if (identidadBloqueada) return
    setForm((prev) => ({
      ...prev,
      tipo_persona: tipo,
      ...(tipo === 'Jurídica' ? { fecha_nacimiento: '', estado_civil: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errores = validarForm(form)
    const hayErrores = Object.values(errores).some(Boolean)
    if (hayErrores) {
      setErroresCampo(errores)
      return
    }

    const identidadOriginal = inquilino ? formDesdeInquilino(inquilino) : null
    const datosEnvio = {
      ...form,
      ...(identidadBloqueada && identidadOriginal
        ? {
            tipo_persona: identidadOriginal.tipo_persona,
            dni_cuit: identidadOriginal.dni_cuit,
          }
        : {}),
    }

    const ok = await onSubmit(datosEnvio)
    if (ok) onClose()
  }

  const hayErroresCampo = Object.values(erroresCampo).some(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <AdminFormModalHeader title={esEdicion ? 'Editar Inquilino' : 'Nuevo Inquilino'} />

        <form noValidate onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
            {esEdicion && identidadBloqueada && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Este inquilino tiene un contrato activo. No podés cambiar el tipo de persona ni el
                DNI/CUIT mientras el contrato esté vigente.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Tipo de persona
              </span>
              <div
                className={`flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-64 ${
                  identidadBloqueada ? 'opacity-60' : ''
                }`}
              >
                {['Física', 'Jurídica'].map((tipo) => {
                  const activo = form.tipo_persona === tipo
                  return (
                    <button
                      key={tipo}
                      type="button"
                      disabled={identidadBloqueada}
                      onClick={() => handleTipoPersona(tipo)}
                      className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed ${
                        activo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tipo === 'Física' ? 'Particular' : 'Empresa'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-1 text-xs font-bold uppercase tracking-widest text-brand-600">
                Datos de identificación
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="nombre_completo" obligatorio>
                    {esJuridica ? 'Razón social' : 'Nombre completo'}
                  </LabelCampo>
                  <input
                    id="nombre_completo"
                    type="text"
                    maxLength={100}
                    value={form.nombre_completo}
                    onChange={handleChange('nombre_completo')}
                    className={campoClass('nombre_completo')}
                    placeholder={esJuridica ? 'Empresa S.A.' : 'Carlos Gómez'}
                  />
                  {erroresCampo.nombre_completo && (
                    <p className="text-xs text-red-600">{erroresCampo.nombre_completo}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="dni_cuit" obligatorio>
                    {esJuridica ? 'CUIT de la empresa' : 'DNI / CUIT'}
                  </LabelCampo>
                  <input
                    id="dni_cuit"
                    type="text"
                    maxLength={14}
                    value={form.dni_cuit}
                    onChange={handleChange('dni_cuit')}
                    disabled={identidadBloqueada}
                    className={campoIdentidadClass('dni_cuit')}
                    placeholder={esJuridica ? '30-70894561-2' : '27-30123456-8'}
                  />
                  {erroresCampo.dni_cuit && (
                    <p className="text-xs text-red-600">{erroresCampo.dni_cuit}</p>
                  )}
                </div>
              </div>

              {!esJuridica && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <LabelCampo htmlFor="fecha_nacimiento">Fecha de nacimiento</LabelCampo>
                    <input
                      id="fecha_nacimiento"
                      type="date"
                      value={form.fecha_nacimiento}
                      onChange={handleChange('fecha_nacimiento')}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <LabelCampo htmlFor="estado_civil">Estado civil</LabelCampo>
                    <select
                      id="estado_civil"
                      value={form.estado_civil}
                      onChange={handleChange('estado_civil')}
                      className={inputClass}
                    >
                      <option value="">Seleccioná...</option>
                      <option value="Soltero/a">Soltero/a</option>
                      <option value="Casado/a">Casado/a</option>
                      <option value="Divorciado/a">Divorciado/a</option>
                      <option value="Viudo/a">Viudo/a</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="border-b border-slate-200/60 pb-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                Contacto y perfil comercial
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="telefono" obligatorio>
                    Teléfono de contacto
                  </LabelCampo>
                  <input
                    id="telefono"
                    type="text"
                    maxLength={20}
                    value={form.telefono}
                    onChange={handleChange('telefono')}
                    className={campoClass('telefono')}
                    placeholder="3513998877"
                  />
                  {erroresCampo.telefono && (
                    <p className="text-xs text-red-600">{erroresCampo.telefono}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="email">Correo electrónico</LabelCampo>
                  <input
                    id="email"
                    type="text"
                    maxLength={100}
                    value={form.email}
                    onChange={handleChange('email')}
                    className={campoClass('email')}
                    placeholder="carlos@email.com"
                  />
                  {erroresCampo.email && (
                    <p className="text-xs text-red-600">{erroresCampo.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <LabelCampo htmlFor="ocupacion">
                  {esJuridica ? 'Rubro / giro comercial' : 'Ocupación / situación laboral'}
                </LabelCampo>
                <input
                  id="ocupacion"
                  type="text"
                  maxLength={120}
                  value={form.ocupacion}
                  onChange={handleChange('ocupacion')}
                  className={inputClass}
                  placeholder={esJuridica ? 'Gastronómico, Logística...' : 'Empleado administrativo'}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                Contacto de emergencia
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="emergencia_nombre">Nombre del contacto</LabelCampo>
                  <input
                    id="emergencia_nombre"
                    type="text"
                    maxLength={100}
                    value={form.emergencia_nombre}
                    onChange={handleChange('emergencia_nombre')}
                    className={inputClass}
                    placeholder="Ej: María Gómez (Madre)"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <LabelCampo htmlFor="emergencia_telefono">Teléfono de emergencia</LabelCampo>
                  <input
                    id="emergencia_telefono"
                    type="text"
                    maxLength={20}
                    value={form.emergencia_telefono}
                    onChange={handleChange('emergencia_telefono')}
                    className={campoClass('emergencia_telefono')}
                    placeholder="3513221100"
                  />
                  {erroresCampo.emergencia_telefono && (
                    <p className="text-xs text-red-600">{erroresCampo.emergencia_telefono}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <LabelCampo htmlFor="observaciones">Observaciones / notas</LabelCampo>
              <textarea
                id="observaciones"
                rows={3}
                maxLength={1000}
                value={form.observaciones}
                onChange={handleChange('observaciones')}
                className={`${campoClass('observaciones')} resize-none`}
                placeholder="Detalles internos (mascotas, acuerdos de pago, etc.)"
              />
              {erroresCampo.observaciones && (
                <p className="text-xs text-red-600">{erroresCampo.observaciones}</p>
              )}
            </div>
          </div>

          {(hayErroresCampo || submitError) && (
            <div className="space-y-2 px-6 py-2">
              {hayErroresCampo && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  Revisá los campos marcados antes de guardar.
                </p>
              )}
              {submitError && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {submitError}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {esEdicion ? 'Guardar cambios' : 'Guardar inquilino'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
