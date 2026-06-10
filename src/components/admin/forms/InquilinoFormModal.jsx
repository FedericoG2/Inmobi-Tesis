import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'

// 🔴 CORREGIDO AQUÍ: Cambiado 'Garantia Propietaria' por 'Propietaria'
const formInicial = {
  tipo_persona: 'Física', 
  nombre_completo: '',
  dni_cuit: '',
  telefono: '',
  email: '',
  fecha_nacimiento: '',
  estado_civil: '',
  ocupacion: '',
  tipo_garantia: 'Propietaria', 
  emergencia_nombre: '',
  emergencia_telefono: '',
  observaciones: ''
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400'

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
    // 🔴 CORREGIDO AQUÍ: Cambiado 'Garantia Propietaria' por 'Propietaria'
    tipo_garantia: inquilino.tipo_garantia ?? 'Propietaria',
    emergencia_nombre: inquilino.emergencia_nombre ?? '',
    emergencia_telefono: inquilino.emergencia_telefono ?? '',
    observaciones: inquilino.observaciones ?? ''
  }
}

export default function InquilinoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  inquilino = null,
}) {
  const [form, setForm] = useState(formInicial)
  const esEdicion = Boolean(inquilino)
  const esJuridica = form.tipo_persona === 'Jurídica'

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      return
    }
    setForm(esEdicion ? formDesdeInquilino(inquilino) : formInicial)
  }, [open, inquilino, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleDirectChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-transparent cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabecera */}
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {esEdicion ? 'Editar inquilino' : 'Agregar inquilino'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ficha comercial y legal del inquilino para la gestión de contratos de Inmobi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          {/* Cuerpo */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
            
            {/* SELECTOR SEGMENTADO */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo de Persona</label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-full sm:w-64">
                {['Física', 'Jurídica'].map((tipo) => {
                  const activo = form.tipo_persona === tipo
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleDirectChange('tipo_persona', tipo)}
                      className={`flex-1 rounded-lg py-1.5 text-center text-xs transition-all duration-150 font-semibold ${
                        activo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tipo === 'Física' ? '👤 Particular' : '🏢 Empresa'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SECCIÓN 1: DATOS PRINCIPALES */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1">
                Datos de Identificación
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nombre_completo" className="text-xs font-medium text-slate-700">
                    {esJuridica ? 'Razón Social' : 'Nombre completo'}
                  </label>
                  <input
                    id="nombre_completo"
                    type="text"
                    required
                    value={form.nombre_completo}
                    onChange={handleChange('nombre_completo')}
                    className={inputClass}
                    placeholder={esJuridica ? 'Empresa S.A.' : 'Carlos Gómez'}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dni_cuit" className="text-xs font-medium text-slate-700">
                    {esJuridica ? 'CUIT de la Empresa' : 'DNI / CUIT'}
                  </label>
                  <input
                    id="dni_cuit"
                    type="text"
                    required
                    value={form.dni_cuit}
                    onChange={handleChange('dni_cuit')}
                    className={inputClass}
                    placeholder={esJuridica ? '30-XXXXXXXX-X' : '20-38444555-2'}
                  />
                </div>
              </div>

              {!esJuridica && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fecha_nacimiento" className="text-xs font-medium text-slate-700">
                      Fecha de Nacimiento
                    </label>
                    <input
                      id="fecha_nacimiento"
                      type="date"
                      value={form.fecha_nacimiento}
                      onChange={handleChange('fecha_nacimiento')}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="estado_civil" className="text-xs font-medium text-slate-700">
                      Estado Civil
                    </label>
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

            {/* SECCIÓN 2: CONTACTO Y PERFIL COMERCIAL */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest pb-1 border-b border-slate-200/60">
                Contacto y Perfil Comercial
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="telefono" className="text-xs font-medium text-slate-700">
                    Teléfono de Contacto
                  </label>
                  <input
                    id="telefono"
                    type="text"
                    required
                    value={form.telefono}
                    onChange={handleChange('telefono')}
                    className={inputClass}
                    placeholder="3513998877"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-slate-700">
                    Correo Electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    className={inputClass}
                    placeholder="carlos@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ocupacion" className="text-xs font-medium text-slate-700">
                    {esJuridica ? 'Rubro / Giro Comercial' : 'Ocupación / Situación Laboral'}
                  </label>
                  <input
                    id="ocupacion"
                    type="text"
                    value={form.ocupacion}
                    onChange={handleChange('ocupacion')}
                    className={inputClass}
                    placeholder={esJuridica ? 'Gastronómico, Logística...' : 'Empleado Administrativo'}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tipo_garantia" className="text-xs font-medium text-slate-700">
                    Tipo de Garantía Presentada
                  </label>
                  <select
                    id="tipo_garantia"
                    required
                    value={form.tipo_garantia}
                    onChange={handleChange('tipo_garantia')}
                    className={inputClass}
                  >   
                    <option value="Propietaria">Propietaria</option>
                    <option value="Recibos de Sueldo">Recibos de Sueldos</option>
                    <option value="Aval Bancario">Aval Bancario</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CONTACTO DE EMERGENCIA */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest border-b border-slate-100 pb-1">
                Contacto de Emergencia
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emergencia_nombre" className="text-xs font-medium text-slate-700">
                    Nombre del Contacto
                  </label>
                  <input
                    id="emergencia_nombre"
                    type="text"
                    value={form.emergencia_nombre}
                    onChange={handleChange('emergencia_nombre')}
                    className={inputClass}
                    placeholder="Ej: María Gómez (Madre)"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emergencia_telefono" className="text-xs font-medium text-slate-700">
                    Teléfono de Emergencia
                  </label>
                  <input
                    id="emergencia_telefono"
                    type="text"
                    value={form.emergencia_telefono}
                    onChange={handleChange('emergencia_telefono')}
                    className={inputClass}
                    placeholder="3513221100"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: OBSERVACIONES */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="observaciones" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Observaciones / Notas de la Gestión
              </label>
              <textarea
                id="observaciones"
                rows={3}
                value={form.observaciones}
                onChange={handleChange('observaciones')}
                className={`${inputClass} resize-none`}
                placeholder="Añadí detalles internos importantes (Ej: Mascotas permitidas, acuerdos especiales de pago, etc.)"
              />
            </div>

          </div>

          {submitError && (
            <div className="px-6 py-2">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{submitError}</p>
            </div>
          )}

          {/* Botonera inferior */}
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting} className="rounded-xl bg-indigo-600 text-white border-none hover:bg-indigo-700 shadow-sm shadow-indigo-100">
              {esEdicion ? 'Guardar cambios' : 'Guardar Inquilino'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}