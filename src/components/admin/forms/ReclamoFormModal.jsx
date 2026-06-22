import { useEffect, useMemo, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from '../AdminFormModalHeader'
import {
  buscarContratoActivoPorInquilino,
  inquilinosConContratoActivo,
} from '../../../utils/contratoActivo'

const estados = ['Pendiente', 'En Proceso', 'Resuelto']
const prioridades = ['Baja', 'Media', 'Alta', 'Urgente']

// Mapeo estético para mantener tus strings exactos de categoría pero con íconos visuales
const CATEGORIAS_OPTIONS = [
  { id: 'Plomeria', label: 'Plomería', icon: '🚰' },
  { id: 'Electricidad', label: 'Electricidad', icon: '⚡' },
  { id: 'Albañilería', label: 'Albañilería', icon: '🧱' },
  { id: 'Cerrajeria', label: 'Cerrajería', icon: '🔑' },
  { id: 'Pintura', label: 'Pintura', icon: '🖌️' },
  { id: 'Estructural', label: 'Estructural', icon: '🏠' },
  { id: 'Gas', label: 'Gas', icon: '🔥' },
]

const formInicial = {
  inquilino_id: '',
  propiedad_id: '',
  titulo: '',
  descripcion: '',
  estado: 'Pendiente',
  prioridad: 'Media',
  categoria: 'Plomeria', 
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const readOnlyClass =
  'w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed'

function formDesdeReclamo(reclamo) {
  return {
    inquilino_id: String(reclamo.inquilino_id ?? ''),
    propiedad_id: String(reclamo.propiedad_id ?? ''),
    titulo: reclamo.titulo ?? '',
    descripcion: reclamo.descripcion ?? '',
    estado: reclamo.estado ?? 'Pendiente',
    prioridad: reclamo.prioridad ?? 'Media',
    categoria: reclamo.categoria ?? 'Plomeria', 
  }
}

export default function ReclamoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  reclamo = null,
  inquilinos,
  inquilinosLoading,
  contratos,
  contratosLoading,
}) {
  const [form, setForm] = useState(formInicial)
  const esEdicion = Boolean(reclamo)

  const inquilinosElegibles = useMemo(
    () => inquilinosConContratoActivo(inquilinos, contratos),
    [inquilinos, contratos]
  )

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      return
    }
    setForm(esEdicion ? formDesdeReclamo(reclamo) : formInicial)
  }, [open, reclamo, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  // Modificado sutilmente para aceptar cambios directos de estado de botones customizados
  const handleDirectChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleInquilinoChange = (e) => {
    const inquilinoId = e.target.value
    const contrato = buscarContratoActivoPorInquilino(contratos, inquilinoId)

    setForm((prev) => ({
      ...prev,
      inquilino_id: inquilinoId,
      propiedad_id: contrato ? String(contrato.propiedad_id) : '',
      estado: 'Pendiente',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onClose()
  }

  const sinInquilinosElegibles = !inquilinosLoading && inquilinosElegibles.length === 0
  const contratoVinculado = buscarContratoActivoPorInquilino(contratos, form.inquilino_id)
  const sinContratoActivo =
    Boolean(form.inquilino_id) && !contratosLoading && !contratoVinculado
  const formDeshabilitadoCrear =
    sinInquilinosElegibles || sinContratoActivo || !form.propiedad_id
  const formDeshabilitado = esEdicion ? false : formDeshabilitadoCrear

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      {/* Backdrop de cierre */}
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-transparent cursor-default"
        onClick={onClose}
      />

      {/* Contenedor principal del modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
        <AdminFormModalHeader title={esEdicion ? 'Editar Reclamo' : 'Nuevo Reclamo'} />

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
            
            {/* SECCIÓN: INQUILINO Y PROPIEDAD VINCULADA */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {/* INQUILINO */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="inquilino_id" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Inquilino
                </label>
                {esEdicion ? (
                  <input
                    id="inquilino_id"
                    type="text"
                    readOnly
                    value={reclamo.inquilinos?.nombre_completo ?? '—'}
                    className={readOnlyClass}
                  />
                ) : inquilinosLoading || contratosLoading ? (
                  <p className="text-sm text-slate-400 py-2">Cargando inquilinos...</p>
                ) : sinInquilinosElegibles ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
                    No hay inquilinos con contrato activo.
                  </p>
                ) : (
                  <select
                    id="inquilino_id"
                    required
                    value={form.inquilino_id}
                    onChange={handleInquilinoChange}
                    className={inputClass}
                  >
                    <option value="">Seleccioná un inquilino</option>
                    {inquilinosElegibles.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre_completo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* PROPIEDAD VINCULADA */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="propiedad_vinculada" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Propiedad vinculada
                </label>
                {esEdicion ? (
                  <input
                    id="propiedad_vinculada"
                    type="text"
                    readOnly
                    value={reclamo.propiedades?.direccion ?? '—'}
                    className={readOnlyClass}
                  />
                ) : contratosLoading ? (
                  <p className="text-sm text-slate-400 py-2">Buscando contrato activo...</p>
                ) : !form.inquilino_id ? (
                  <input
                    id="propiedad_vinculada"
                    type="text"
                    readOnly
                    value=""
                    placeholder="Seleccioná un inquilino primero"
                    className={readOnlyClass}
                  />
                ) : sinContratoActivo ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
                    Este inquilino no tiene un contrato activo.
                  </p>
                ) : (
                  <input
                    id="propiedad_vinculada"
                    type="text"
                    readOnly
                    value={contratoVinculado?.propiedades?.direccion ?? '—'}
                    className={readOnlyClass}
                  />
                )}
              </div>
            </div>

            {/* TÍTULO */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="titulo" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Título del Reclamo
              </label>
              <input
                id="titulo"
                type="text"
                required
                value={form.titulo}
                onChange={handleChange('titulo')}
                className={inputClass}
                placeholder="Ej: Pérdida de presión de agua"
                disabled={formDeshabilitado}
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="descripcion" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Descripción detallada
              </label>
              <textarea
                id="descripcion"
                required
                rows={3}
                value={form.descripcion}
                onChange={handleChange('descripcion')}
                className={`${inputClass} resize-none`}
                placeholder="Describí el problema con precisión..."
                disabled={formDeshabilitado}
              />
            </div>

           
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Categoría del Incidente
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIAS_OPTIONS.map((cat) => {
                  const esSeleccionado = form.categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={formDeshabilitado}
                      onClick={() => handleDirectChange('categoria', cat.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-all duration-150 ${
                        esSeleccionado
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-2 ring-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Prioridad asignada
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                {prioridades.map((prio) => {
                  const esSeleccionado = form.prioridad === prio
                  let estiloActivo = 'bg-white text-slate-900 shadow-sm font-semibold'
                  
                  if (esSeleccionado && prio === 'Urgente') estiloActivo = 'bg-red-500 text-white shadow-sm font-semibold'
                  if (esSeleccionado && prio === 'Alta') estiloActivo = 'bg-amber-500 text-white shadow-sm font-semibold'

                  return (
                    <button
                      key={prio}
                      type="button"
                      disabled={formDeshabilitado}
                      onClick={() => handleDirectChange('prioridad', prio)}
                      className={`flex-1 rounded-lg py-1.5 text-center text-xs transition-all duration-150 ${
                        esSeleccionado ? estiloActivo : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                      }`}
                    >
                      {prio}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ESTADO (Solo editable si es edición de reclamo) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="estado" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Estado del Reclamo
              </label>
              {esEdicion ? (
                <select
                  id="estado"
                  required
                  value={form.estado}
                  onChange={handleChange('estado')}
                  className={inputClass}
                >
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="estado"
                  type="text"
                  readOnly
                  value="Pendiente"
                  className={readOnlyClass}
                />
              )}
            </div>

            {/* ERRORES DE SUBMIT */}
            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">
                {submitError}
              </p>
            )}
          </div>

          {/* BOTONERA INFERIOR (Tremor UI Buttons) */}
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              disabled={submitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              loading={submitting} 
              disabled={submitting || formDeshabilitado}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm shadow-indigo-100"
            >
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}