import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from '../AdminFormModalHeader'
import InquilinoPickerModal from './InquilinoPickerModal'
import InquilinoDetalleModal from '../InquilinoDetalleModal'
import PropiedadDetalleModal from '../PropiedadDetalleModal'
import { subirAdjuntoReclamo, validarImagenReclamo } from '../../../services/documentosService'
import {
  buscarContratoActivoPorInquilino,
  contratosActivosPorInquilino,
  inquilinosConContratoActivo,
} from '../../../utils/contratoActivo'
import { CATEGORIAS_RECLAMO, PRIORIDADES_RECLAMO } from '../../../utils/reclamosUi'
import { RECLAMO_LIMITES, sinErrores, validarReclamoAdmin } from '../../../utils/validarReclamo'

// Mapeo estético para mantener tus strings exactos de categoría pero con íconos visuales
const CATEGORIAS_OPTIONS = CATEGORIAS_RECLAMO
const prioridades = PRIORIDADES_RECLAMO

// Tope de imágenes por reclamo (cada una se valida a 10 MB en el service).
const MAX_IMAGENES = 5

// Color del botón activo según la prioridad seleccionada
const COLOR_PRIORIDAD_ACTIVA = {
  Baja: 'bg-blue-500 text-white shadow-sm font-semibold',
  Media: 'bg-emerald-500 text-white shadow-sm font-semibold',
  Alta: 'bg-amber-500 text-white shadow-sm font-semibold',
  Urgente: 'bg-red-600 text-white shadow-sm font-semibold',
}

const formInicial = {
  inquilino_id: '',
  propiedad_id: '',
  contrato_id: '',
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  categoria: 'Plomeria', 
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const readOnlyClass =
  'w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed'

// Barra compacta para mostrar la selección ya hecha (inquilino / propiedad)
const displayBarClass =
  'flex items-center justify-between gap-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm'

const verDetalleLinkClass =
  'text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline'

const inputErrorClass = 'border-red-400 focus:border-red-500 focus:ring-red-100'

function MensajeError({ children }) {
  if (!children) return null
  return <p className="text-xs font-medium text-red-600">{children}</p>
}

function IconInfo({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    </svg>
  )
}

function formDesdeReclamo(reclamo) {
  return {
    inquilino_id: String(reclamo.inquilino_id ?? ''),
    propiedad_id: String(reclamo.propiedad_id ?? ''),
    contrato_id: String(reclamo.contrato_id ?? ''),
    titulo: reclamo.titulo ?? '',
    descripcion: reclamo.descripcion ?? '',
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
  propiedades = [],
}) {
  const [form, setForm] = useState(formInicial)
  const [errores, setErrores] = useState({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)
  const [imagenes, setImagenes] = useState([])
  const [imagenesError, setImagenesError] = useState(null)
  const [subiendoImagenes, setSubiendoImagenes] = useState(false)
  // Una vez guardado el reclamo en este intento, recordamos su destino para que
  // un reintento de subida no vuelva a crear/actualizar el reclamo.
  const [guardado, setGuardado] = useState(null)
  const imagenInputRef = useRef(null)
  const esEdicion = Boolean(reclamo)

  const inquilinosElegibles = useMemo(
    () => inquilinosConContratoActivo(inquilinos, contratos),
    [inquilinos, contratos]
  )

  const contratosDelInquilino = useMemo(
    () => contratosActivosPorInquilino(contratos, form.inquilino_id),
    [contratos, form.inquilino_id]
  )

  const multiplesContratos = contratosDelInquilino.length > 1

  const inquilinoSeleccionado = useMemo(
    () => inquilinosElegibles.find((i) => String(i.id) === String(form.inquilino_id)) ?? null,
    [inquilinosElegibles, form.inquilino_id]
  )

  const propiedadSeleccionada = useMemo(
    () => propiedades.find((p) => String(p.id) === String(form.propiedad_id)) ?? null,
    [propiedades, form.propiedad_id]
  )

  const previews = useMemo(
    () => imagenes.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [imagenes]
  )

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      setErrores({})
      setImagenes([])
      setImagenesError(null)
      setSubiendoImagenes(false)
      setGuardado(null)
      return
    }
    setForm(esEdicion ? formDesdeReclamo(reclamo) : formInicial)
    setErrores({})
    setImagenes([])
    setImagenesError(null)
    setSubiendoImagenes(false)
    setGuardado(null)
  }, [open, reclamo, esEdicion])

  if (!open) return null

  const limpiarError = (field) => {
    setErrores((prev) => {
      if (!prev[field]) return prev
      const siguiente = { ...prev }
      delete siguiente[field]
      return siguiente
    })
  }

  const handleChange = (field) => (e) => {
    const { value } = e.target
    setForm((prev) => ({ ...prev, [field]: value }))
    limpiarError(field)
  }

  // Modificado sutilmente para aceptar cambios directos de estado de botones customizados
  const handleDirectChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    limpiarError(field)
  }

  const seleccionarInquilino = (inquilinoId) => {
    const activos = contratosActivosPorInquilino(contratos, inquilinoId)
    // Si tiene un único contrato activo, se asocia automáticamente.
    // Si tiene varios, queda vacío hasta que el admin elija la propiedad.
    const unico = activos.length === 1 ? activos[0] : null

    setForm((prev) => ({
      ...prev,
      inquilino_id: String(inquilinoId ?? ''),
      propiedad_id: unico ? String(unico.propiedad_id) : '',
      contrato_id: unico ? String(unico.id) : '',
    }))
    setErrores((prev) => {
      const siguiente = { ...prev }
      delete siguiente.inquilino_id
      if (unico) delete siguiente.propiedad_id
      return siguiente
    })
  }

  const handleSelectInquilino = (inquilino) => {
    seleccionarInquilino(inquilino.id)
    setPickerOpen(false)
  }

  const limpiarInquilino = () => {
    setForm((prev) => ({
      ...prev,
      inquilino_id: '',
      propiedad_id: '',
      contrato_id: '',
    }))
  }

  const handleContratoChange = (e) => {
    const contratoId = e.target.value
    const contrato = contratosDelInquilino.find((c) => String(c.id) === String(contratoId))
    setForm((prev) => ({
      ...prev,
      contrato_id: contratoId,
      propiedad_id: contrato ? String(contrato.propiedad_id) : '',
    }))
    limpiarError('propiedad_id')
  }

  const handleAgregarImagenes = (event) => {
    const files = Array.from(event.target.files ?? [])
    if (event.target) event.target.value = ''
    if (files.length === 0) return

    setImagenesError(null)
    const aceptadas = []
    for (const file of files) {
      const validacion = validarImagenReclamo(file)
      if (validacion.error) {
        setImagenesError(validacion.error.message)
        continue
      }
      aceptadas.push(file)
    }

    setImagenes((prev) => {
      const combinado = [...prev, ...aceptadas]
      if (combinado.length > MAX_IMAGENES) {
        setImagenesError(`Podés adjuntar hasta ${MAX_IMAGENES} imágenes.`)
        return combinado.slice(0, MAX_IMAGENES)
      }
      return combinado
    })
  }

  const quitarImagen = (index) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index))
    setImagenesError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const erroresValidacion = validarReclamoAdmin(form)

    if (!sinErrores(erroresValidacion)) {
      setErrores(erroresValidacion)
      return
    }

    setErrores({})

    // 1) Guardar el reclamo (solo si todavía no se guardó en este intento).
    let destino = guardado
    if (!destino) {
      const payload = {
        ...form,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
      }
      const resultado = await onSubmit(payload)
      if (!resultado) return

      destino = esEdicion
        ? { id: reclamo.id, propiedad_id: reclamo.propiedad_id }
        : {
            id: resultado.id,
            propiedad_id: resultado.propiedad_id ?? Number(form.propiedad_id),
          }
      setGuardado(destino)
    }

    // 2) Subir imágenes (best-effort). Si alguna falla, queda para reintentar
    //    sin volver a crear/actualizar el reclamo.
    if (imagenes.length === 0) {
      onClose()
      return
    }

    setSubiendoImagenes(true)
    setImagenesError(null)
    const fallidas = []
    for (const file of imagenes) {
      const { error } = await subirAdjuntoReclamo({
        reclamoId: destino.id,
        propiedadId: destino.propiedad_id,
        archivo: file,
      })
      if (error) fallidas.push(file)
    }
    setSubiendoImagenes(false)

    if (fallidas.length > 0) {
      setImagenes(fallidas)
      setImagenesError(
        `No se pudieron subir ${fallidas.length} imagen(es). Tocá "Reintentar" para volver a intentarlo.`
      )
      return
    }

    onClose()
  }

  const sinInquilinosElegibles = !inquilinosLoading && inquilinosElegibles.length === 0
  const contratoVinculado = buscarContratoActivoPorInquilino(contratos, form.inquilino_id)
  const sinContratoActivo =
    Boolean(form.inquilino_id) && !contratosLoading && !contratoVinculado
  const formDeshabilitadoCrear =
    sinInquilinosElegibles || sinContratoActivo || !form.propiedad_id
  const formDeshabilitado = esEdicion ? false : formDeshabilitadoCrear

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      {/* Backdrop de cierre */}
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-transparent cursor-default"
        onClick={onClose}
      />

      {/* Contenedor principal del modal */}
      <div className="relative z-10 flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
        <AdminFormModalHeader title={esEdicion ? 'Editar Reclamo' : 'Nuevo Reclamo'} />

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            
            {/* SECCIÓN: INQUILINO Y PROPIEDAD VINCULADA */}
            <div className="flex flex-col gap-4">
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
                ) : inquilinoSeleccionado ? (
                  <>
                    <div className={displayBarClass}>
                      <span className="truncate text-slate-900">{inquilinoSeleccionado.nombre_completo}</span>
                      <button
                        type="button"
                        onClick={limpiarInquilino}
                        className="shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Quitar inquilino seleccionado"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetalleInquilinoOpen(true)}
                      className={`mt-1 self-start ${verDetalleLinkClass}`}
                    >
                      Ver detalle del inquilino
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className={`flex items-center justify-between gap-2 ${inputClass} text-left`}
                  >
                    <span className="text-slate-400">Seleccioná un inquilino</span>
                    <svg
                      className="h-4 w-4 shrink-0 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                )}
                <MensajeError>{errores.inquilino_id}</MensajeError>
              </div>

              {/* PROPIEDAD DEL RECLAMO */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="propiedad_vinculada" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Propiedad del Reclamo
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
                ) : multiplesContratos ? (
                  <>
                    <select
                      id="propiedad_vinculada"
                      required
                      value={form.contrato_id}
                      onChange={handleContratoChange}
                      className={inputClass}
                    >
                      <option value="">Seleccioná una propiedad</option>
                      {contratosDelInquilino.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.propiedades?.direccion ?? `Contrato #${c.id}`}
                        </option>
                      ))}
                    </select>
                    {form.propiedad_id && propiedadSeleccionada && (
                      <button
                        type="button"
                        onClick={() => setDetallePropiedadOpen(true)}
                        className={`mt-1 self-start ${verDetalleLinkClass}`}
                      >
                        Ver detalle de la propiedad
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className={displayBarClass}>
                      <span className="truncate text-slate-700">
                        {contratoVinculado?.propiedades?.direccion ?? '—'}
                      </span>
                    </div>
                    {propiedadSeleccionada && (
                      <button
                        type="button"
                        onClick={() => setDetallePropiedadOpen(true)}
                        className={`mt-1 self-start ${verDetalleLinkClass}`}
                      >
                        Ver detalle de la propiedad
                      </button>
                    )}
                  </>
                )}
                <MensajeError>{errores.propiedad_id}</MensajeError>
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
                maxLength={RECLAMO_LIMITES.TITULO_MAX}
                value={form.titulo}
                onChange={handleChange('titulo')}
                className={`${inputClass} ${errores.titulo ? inputErrorClass : ''}`}
                placeholder="Ej: Pérdida de presión de agua"
                disabled={formDeshabilitado}
                aria-invalid={Boolean(errores.titulo)}
              />
              <MensajeError>{errores.titulo}</MensajeError>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="descripcion" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Descripción detallada
              </label>
              <textarea
                id="descripcion"
                required
                rows={2}
                maxLength={RECLAMO_LIMITES.DESCRIPCION_MAX}
                value={form.descripcion}
                onChange={handleChange('descripcion')}
                className={`${inputClass} resize-none ${errores.descripcion ? inputErrorClass : ''}`}
                placeholder="Describí el problema con precisión..."
                disabled={formDeshabilitado}
                aria-invalid={Boolean(errores.descripcion)}
              />
              <div className="flex items-center justify-between gap-2">
                <MensajeError>{errores.descripcion}</MensajeError>
                <span className="ml-auto text-[11px] text-slate-400">
                  {form.descripcion.length}/{RECLAMO_LIMITES.DESCRIPCION_MAX}
                </span>
              </div>
            </div>

            {/* IMÁGENES (OPCIONAL) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Imágenes{' '}
                <span className="font-normal normal-case text-slate-400">
                  (opcional · hasta {MAX_IMAGENES})
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {previews.map((p, idx) => (
                  <div
                    key={p.url}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => quitarImagen(idx)}
                      disabled={subiendoImagenes}
                      aria-label={`Quitar ${p.file.name}`}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-red-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {imagenes.length < MAX_IMAGENES && (
                  <button
                    type="button"
                    onClick={() => imagenInputRef.current?.click()}
                    disabled={formDeshabilitado || subiendoImagenes}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-[11px] font-medium">Agregar</span>
                  </button>
                )}
              </div>
              <input
                ref={imagenInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleAgregarImagenes}
              />
              <MensajeError>{imagenesError}</MensajeError>
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
              <MensajeError>{errores.categoria}</MensajeError>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Prioridad asignada
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                {prioridades.map((prio) => {
                  const esSeleccionado = form.prioridad === prio
                  const estiloActivo =
                    COLOR_PRIORIDAD_ACTIVA[prio] ?? 'bg-white text-slate-900 shadow-sm font-semibold'

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

            {esEdicion && (
              <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                <p>
                  La gestión de los estados del reclamo y el seguimiento se hace desde la
                  funcionalidad <span className="font-semibold">Gestionar</span>.
                </p>
              </div>
            )}

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
              disabled={submitting || subiendoImagenes}
              className="rounded-xl"
            >
              {guardado ? 'Cerrar' : 'Cancelar'}
            </Button>
            <Button 
              type="submit" 
              loading={submitting || subiendoImagenes} 
              disabled={submitting || subiendoImagenes || formDeshabilitado}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm shadow-indigo-100"
            >
              {guardado ? 'Reintentar' : esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>

        </form>
      </div>

      {!esEdicion && (
        <InquilinoPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleSelectInquilino}
          inquilinos={inquilinosElegibles}
          contratos={contratos}
          selectedId={form.inquilino_id}
        />
      )}

      <InquilinoDetalleModal
        open={detalleInquilinoOpen}
        inquilino={inquilinoSeleccionado}
        onClose={() => setDetalleInquilinoOpen(false)}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadSeleccionada}
        onClose={() => setDetallePropiedadOpen(false)}
        apilado
      />
    </div>
  )
}