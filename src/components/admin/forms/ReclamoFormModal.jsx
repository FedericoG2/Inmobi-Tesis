import { useEffect, useMemo, useRef, useState } from 'react'
import AdminFormModalHeader from '../AdminFormModalHeader'
import InquilinoPickerModal from './InquilinoPickerModal'
import InquilinoDetalleModal from '../InquilinoDetalleModal'
import PropiedadDetalleModal from '../PropiedadDetalleModal'
import { subirAdjuntoReclamo, validarImagenReclamo, listarAdjuntosReclamo, obtenerUrlDescargaDocumento } from '../../../services/documentosService'
import {
  buscarContratoActivoPorInquilino,
  contratosActivosPorInquilino,
  inquilinosConContratoActivo,
} from '../../../utils/contratoActivo'
import { CATEGORIAS_RECLAMO, PRIORIDAD_SEGMENTO_ACTIVO, PRIORIDADES_RECLAMO } from '../../../utils/reclamosUi'
import { RECLAMO_LIMITES, sinErrores, validarReclamoAdmin } from '../../../utils/validarReclamo'
import {
  IconArrowRight,
  IconBuilding,
  IconImage,
  IconInfo,
  IconPlus,
  IconUser,
  IconWrench,
  IconX,
} from '../../icons/Icons'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import DetalleFila from '../../ui/DetailField'
import {
  calloutClass,
  cn,
  eyebrow,
  fieldErrorClass,
  inputClass,
  inputErrorClass,
  labelClass,
  modalFooterClass,
  modalFormClass,
  optionCardClass,
  segmentedClass,
  textareaClass,
  textareaErrorClass,
} from '../../../utils/ui'

const CATEGORIAS_OPTIONS = CATEGORIAS_RECLAMO
const prioridades = PRIORIDADES_RECLAMO

// Tope de imágenes por reclamo (cada una se valida a 10 MB en el service).
const MAX_IMAGENES = 5


const formInicial = {
  inquilino_id: '',
  propiedad_id: '',
  contrato_id: '',
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  categoria: 'Plomeria',
}

const verDetalleLinkClass =
  'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-800'

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3 className={`${eyebrow} ${className}`}>{children}</h3>
  )
}

function MensajeError({ children }) {
  if (!children) return null
  return <p className={fieldErrorClass}>{children}</p>
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
  const [adjuntosExistentes, setAdjuntosExistentes] = useState([])
  const [urlsExistentes, setUrlsExistentes] = useState({})
  const [cargandoAdjuntos, setCargandoAdjuntos] = useState(false)
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

  const inquilinoFull = useMemo(
    () =>
      inquilinos.find((i) => String(i.id) === String(form.inquilino_id)) ??
      inquilinoSeleccionado ??
      null,
    [inquilinos, form.inquilino_id, inquilinoSeleccionado]
  )

  const totalImagenes = adjuntosExistentes.length + imagenes.length

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
      setAdjuntosExistentes([])
      setUrlsExistentes({})
      setCargandoAdjuntos(false)
      return
    }
    setForm(esEdicion ? formDesdeReclamo(reclamo) : formInicial)
    setErrores({})
    setImagenes([])
    setImagenesError(null)
    setSubiendoImagenes(false)
    setGuardado(null)
    setAdjuntosExistentes([])
    setUrlsExistentes({})
  }, [open, reclamo, esEdicion])

  useEffect(() => {
    if (!open || !esEdicion || !reclamo?.id) return undefined

    let activo = true

    async function cargarAdjuntos() {
      setCargandoAdjuntos(true)
      const { data, error } = await listarAdjuntosReclamo(reclamo.id)
      if (!activo) return
      if (error) {
        setAdjuntosExistentes([])
        setUrlsExistentes({})
        setCargandoAdjuntos(false)
        return
      }

      const lista = data ?? []
      setAdjuntosExistentes(lista)

      const entradas = await Promise.all(
        lista.map(async (doc) => {
          const { data: urlData } = await obtenerUrlDescargaDocumento(doc.url_archivo)
          return [doc.id, urlData?.signedUrl ?? null]
        })
      )
      if (!activo) return
      setUrlsExistentes(Object.fromEntries(entradas))
      setCargandoAdjuntos(false)
    }

    cargarAdjuntos()
    return () => {
      activo = false
    }
  }, [open, esEdicion, reclamo?.id])

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
      const maxNuevas = MAX_IMAGENES - adjuntosExistentes.length
      if (combinado.length > maxNuevas) {
        setImagenesError(`Podés adjuntar hasta ${MAX_IMAGENES} imágenes en total.`)
        return combinado.slice(0, maxNuevas)
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
    <>
      <Modal
        open={open}
        onClose={submitting || subiendoImagenes ? undefined : onClose}
        size="5xl"
        labelledBy="reclamo-form-titulo"
      >
        <AdminFormModalHeader
          titleId="reclamo-form-titulo"
          title={esEdicion ? 'Editar reclamo' : 'Nuevo reclamo'}
          icon={<IconWrench className="h-5 w-5" />}
          onClose={submitting || subiendoImagenes ? undefined : onClose}
        />

        <div className="shrink-0 border-b border-slate-100 px-6 py-4">
          <SeccionTitulo className="mb-2.5">Partes</SeccionTitulo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              {esEdicion ? (
                <DetalleFila
                  label="Inquilino"
                  value={reclamo.inquilinos?.nombre_completo ?? '—'}
                  icon={IconUser}
                  action={
                    inquilinoFull ? (
                      <button type="button" onClick={() => setDetalleInquilinoOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                    ) : null
                  }
                />
              ) : inquilinosLoading || contratosLoading ? (
                <DetalleFila label="Inquilino" value="Cargando…" icon={IconUser} />
              ) : sinInquilinosElegibles ? (
                <div className={calloutClass('warning')}>No hay inquilinos con contrato activo.</div>
              ) : inquilinoSeleccionado ? (
                <DetalleFila
                  label="Inquilino"
                  value={inquilinoSeleccionado.nombre_completo}
                  icon={IconUser}
                  action={
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => setDetalleInquilinoOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                      <button
                        type="button"
                        onClick={limpiarInquilino}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                        aria-label="Quitar inquilino seleccionado"
                      >
                        <IconX className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  }
                />
              ) : (
                <DetalleFila label="Inquilino" icon={IconUser}>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="text-sm font-medium text-brand-600 transition hover:text-brand-800"
                  >
                    Seleccioná un inquilino
                  </button>
                </DetalleFila>
              )}
              <MensajeError>{errores.inquilino_id}</MensajeError>
            </div>

            <div className="space-y-1">
              {esEdicion ? (
                <DetalleFila
                  label="Propiedad"
                  value={reclamo.propiedades?.direccion ?? '—'}
                  icon={IconBuilding}
                  action={
                    propiedadSeleccionada ? (
                      <button type="button" onClick={() => setDetallePropiedadOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                    ) : null
                  }
                />
              ) : contratosLoading ? (
                <DetalleFila label="Propiedad" value="Buscando contrato…" icon={IconBuilding} />
              ) : !form.inquilino_id ? (
                <DetalleFila label="Propiedad" value="Seleccioná un inquilino primero" icon={IconBuilding} />
              ) : sinContratoActivo ? (
                <div className={calloutClass('warning')}>Este inquilino no tiene un contrato activo.</div>
              ) : multiplesContratos ? (
                <DetalleFila label="Propiedad" icon={IconBuilding}>
                  <select
                    id="propiedad_vinculada"
                    required
                    value={form.contrato_id}
                    onChange={handleContratoChange}
                    className={cn(inputClass, 'mt-0.5 h-9')}
                  >
                    <option value="">Seleccioná una propiedad</option>
                    {contratosDelInquilino.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.propiedades?.direccion ?? `Contrato #${c.id}`}
                      </option>
                    ))}
                  </select>
                </DetalleFila>
              ) : (
                <DetalleFila
                  label="Propiedad"
                  value={contratoVinculado?.propiedades?.direccion ?? '—'}
                  icon={IconBuilding}
                  action={
                    propiedadSeleccionada ? (
                      <button type="button" onClick={() => setDetallePropiedadOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                    ) : null
                  }
                />
              )}
              <MensajeError>{errores.propiedad_id}</MensajeError>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={modalFormClass}>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-5">
                <div>
                  <label htmlFor="titulo" className={labelClass}>
                    Título del reclamo
                  </label>
                  <input
                    id="titulo"
                    type="text"
                    required
                    maxLength={RECLAMO_LIMITES.TITULO_MAX}
                    value={form.titulo}
                    onChange={handleChange('titulo')}
                    className={cn(errores.titulo ? inputErrorClass : inputClass, 'font-medium')}
                    placeholder="Ej: Pérdida de presión de agua"
                    disabled={formDeshabilitado}
                    aria-invalid={Boolean(errores.titulo)}
                  />
                  <MensajeError>{errores.titulo}</MensajeError>
                </div>

                <div>
                  <label htmlFor="descripcion" className={labelClass}>
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    required
                    rows={4}
                    maxLength={RECLAMO_LIMITES.DESCRIPCION_MAX}
                    value={form.descripcion}
                    onChange={handleChange('descripcion')}
                    className={cn(errores.descripcion ? textareaErrorClass : textareaClass, 'resize-none')}
                    placeholder="Describí el problema con precisión…"
                    disabled={formDeshabilitado}
                    aria-invalid={Boolean(errores.descripcion)}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <MensajeError>{errores.descripcion}</MensajeError>
                    <span className="ml-auto text-xs tabular-nums text-slate-400">
                      {form.descripcion.length}/{RECLAMO_LIMITES.DESCRIPCION_MAX}
                    </span>
                  </div>
                </div>

                <div>
                  <p className={labelClass}>
                    Imágenes <span className="font-normal text-slate-400">(opcional · hasta {MAX_IMAGENES})</span>
                  </p>

                  {cargandoAdjuntos ? (
                    <p className="text-sm text-slate-500">Cargando imágenes…</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {adjuntosExistentes.map((doc) => (
                        <div
                          key={doc.id}
                          className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        >
                          {urlsExistentes[doc.id] ? (
                            <img
                              src={urlsExistentes[doc.id]}
                              alt={doc.nombre}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <IconImage className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      ))}
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
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow-card ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                          >
                            <IconX className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      {totalImagenes < MAX_IMAGENES && (
                        <button
                          type="button"
                          onClick={() => imagenInputRef.current?.click()}
                          disabled={formDeshabilitado || subiendoImagenes}
                          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <IconPlus className="h-5 w-5" />
                          <span className="text-xs font-medium">Agregar</span>
                        </button>
                      )}
                    </div>
                  )}

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
              </div>

              <div className="space-y-5 lg:self-start">
                <div>
                  <p className={labelClass}>Categoría</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS_OPTIONS.map((cat) => {
                      const esSeleccionado = form.categoria === cat.id
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={formDeshabilitado}
                          onClick={() => handleDirectChange('categoria', cat.id)}
                          className={cn(optionCardClass(esSeleccionado), 'disabled:opacity-50')}
                        >
                          <Icon className={cn('h-4 w-4 shrink-0', esSeleccionado ? 'text-brand-600' : 'text-slate-400')} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <MensajeError>{errores.categoria}</MensajeError>
                </div>

                <div>
                  <p className={labelClass}>Prioridad</p>
                  <div className={segmentedClass}>
                    {prioridades.map((prio) => {
                      const esSeleccionado = form.prioridad === prio

                      return (
                        <button
                          key={prio}
                          type="button"
                          disabled={formDeshabilitado}
                          onClick={() => handleDirectChange('prioridad', prio)}
                          className={cn(
                            'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition disabled:opacity-50',
                            esSeleccionado
                              ? PRIORIDAD_SEGMENTO_ACTIVO[prio] ?? 'bg-white text-slate-900 shadow-card'
                              : 'text-slate-500 hover:text-slate-900'
                          )}
                        >
                          {prio}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {esEdicion && (
                  <div className={cn(calloutClass('info'), 'flex items-start gap-2')}>
                    <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <p>
                      La gestión de estados y el seguimiento se hace desde <span className="font-medium">Gestionar</span>.
                    </p>
                  </div>
                )}

                {submitError && <p className={calloutClass('danger')}>{submitError}</p>}
              </div>
            </div>
          </div>

          <div className={modalFooterClass}>
            <Button variant="secondary" onClick={onClose} disabled={submitting || subiendoImagenes}>
              {guardado ? 'Cerrar' : 'Cancelar'}
            </Button>
            <Button type="submit" loading={submitting || subiendoImagenes} disabled={formDeshabilitado}>
              {guardado ? 'Reintentar' : esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

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
        inquilino={inquilinoFull}
        onClose={() => setDetalleInquilinoOpen(false)}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadSeleccionada}
        onClose={() => setDetallePropiedadOpen(false)}
        apilado
      />
    </>
  )
}
