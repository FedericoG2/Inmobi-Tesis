import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@tremor/react'
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
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

const verDetalleLinkClass =
  'shrink-0 text-xs font-semibold text-brand-600 transition hover:text-brand-700 hover:underline'

const inputErrorClass = 'border-red-400 focus:border-red-500 focus:ring-red-100'

function IconWrench({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608"
      />
    </svg>
  )
}

function IconUser({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  )
}

function IconBuilding({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5M3.75 21V7.5a1.5 1.5 0 0 1 1.5-1.5h4.5a1.5 1.5 0 0 1 1.5 1.5V21M13.5 21V4.5a1.5 1.5 0 0 1 1.5-1.5h3.75a1.5 1.5 0 0 1 1.5 1.5V21M6.75 9h.008v.008H6.75V9Zm0 3h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Z"
      />
    </svg>
  )
}

function IconImage({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  )
}

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3 className={`text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}>
      {children}
    </h3>
  )
}

function DetalleFila({ label, value, icon: Icon, action, children, className = '' }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p className="text-sm font-medium leading-tight text-slate-800 break-words">{value}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function SeccionCard({ children, className = '' }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white px-3 py-2.5 ${className}`}>
      {children}
    </section>
  )
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
        <AdminFormModalHeader
          title={esEdicion ? 'Editar Reclamo' : 'Nuevo Reclamo'}
          icon={<IconWrench />}
        />

        <div className="border-b border-slate-100 px-6 py-3">
          <SeccionTitulo className="mb-2">Partes</SeccionTitulo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              {esEdicion ? (
                <DetalleFila
                  label="Inquilino"
                  value={reclamo.inquilinos?.nombre_completo ?? '—'}
                  icon={IconUser}
                  action={
                    inquilinoFull ? (
                      <button
                        type="button"
                        onClick={() => setDetalleInquilinoOpen(true)}
                        className={verDetalleLinkClass}
                      >
                        Ver detalle
                      </button>
                    ) : null
                  }
                />
              ) : inquilinosLoading || contratosLoading ? (
                <DetalleFila label="Inquilino" value="Cargando…" icon={IconUser} />
              ) : sinInquilinosElegibles ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No hay inquilinos con contrato activo.
                </div>
              ) : inquilinoSeleccionado ? (
                <DetalleFila
                  label="Inquilino"
                  value={inquilinoSeleccionado.nombre_completo}
                  icon={IconUser}
                  action={
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetalleInquilinoOpen(true)}
                        className={verDetalleLinkClass}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={limpiarInquilino}
                        className="rounded-md p-0.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
                        aria-label="Quitar inquilino seleccionado"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  }
                />
              ) : (
                <DetalleFila label="Inquilino" icon={IconUser}>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="text-sm font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
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
                      <button
                        type="button"
                        onClick={() => setDetallePropiedadOpen(true)}
                        className={verDetalleLinkClass}
                      >
                        Ver detalle
                      </button>
                    ) : null
                  }
                />
              ) : contratosLoading ? (
                <DetalleFila label="Propiedad" value="Buscando contrato…" icon={IconBuilding} />
              ) : !form.inquilino_id ? (
                <DetalleFila label="Propiedad" value="Seleccioná un inquilino primero" icon={IconBuilding} />
              ) : sinContratoActivo ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Este inquilino no tiene un contrato activo.
                </div>
              ) : multiplesContratos ? (
                <DetalleFila label="Propiedad" icon={IconBuilding}>
                  <select
                    id="propiedad_vinculada"
                    required
                    value={form.contrato_id}
                    onChange={handleContratoChange}
                    className={`${inputClass} mt-0.5 py-1.5`}
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
                      <button
                        type="button"
                        onClick={() => setDetallePropiedadOpen(true)}
                        className={verDetalleLinkClass}
                      >
                        Ver detalle
                      </button>
                    ) : null
                  }
                />
              )}
              <MensajeError>{errores.propiedad_id}</MensajeError>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-3">
                <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2">
                  <label htmlFor="titulo" className="text-[11px] font-medium text-brand-700">
                    Título del reclamo
                  </label>
                  <input
                    id="titulo"
                    type="text"
                    required
                    maxLength={RECLAMO_LIMITES.TITULO_MAX}
                    value={form.titulo}
                    onChange={handleChange('titulo')}
                    className={`mt-1 w-full rounded-lg border border-brand-100 bg-white/90 px-3 py-2 text-base font-semibold text-brand-950 outline-none transition placeholder:font-normal placeholder:text-brand-300 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 ${errores.titulo ? inputErrorClass : ''}`}
                    placeholder="Ej: Pérdida de presión de agua"
                    disabled={formDeshabilitado}
                    aria-invalid={Boolean(errores.titulo)}
                  />
                  <MensajeError>{errores.titulo}</MensajeError>
                </div>

                <SeccionCard>
                  <SeccionTitulo className="mb-1.5">Descripción</SeccionTitulo>
                  <textarea
                    id="descripcion"
                    required
                    rows={4}
                    maxLength={RECLAMO_LIMITES.DESCRIPCION_MAX}
                    value={form.descripcion}
                    onChange={handleChange('descripcion')}
                    className={`w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 ${errores.descripcion ? inputErrorClass : ''}`}
                    placeholder="Describí el problema con precisión…"
                    disabled={formDeshabilitado}
                    aria-invalid={Boolean(errores.descripcion)}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <MensajeError>{errores.descripcion}</MensajeError>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {form.descripcion.length}/{RECLAMO_LIMITES.DESCRIPCION_MAX}
                    </span>
                  </div>
                </SeccionCard>

                <SeccionCard>
                  <SeccionTitulo className="mb-1.5">
                    Imágenes
                    <span className="ml-1 font-normal normal-case text-slate-400">
                      (opcional · hasta {MAX_IMAGENES})
                    </span>
                  </SeccionTitulo>

                  {cargandoAdjuntos ? (
                    <p className="text-xs text-slate-400">Cargando imágenes…</p>
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
                              <IconImage />
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
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-red-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {totalImagenes < MAX_IMAGENES && (
                        <button
                          type="button"
                          onClick={() => imagenInputRef.current?.click()}
                          disabled={formDeshabilitado || subiendoImagenes}
                          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span className="text-[11px] font-medium">Agregar</span>
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
                </SeccionCard>
              </div>

              <div className="space-y-3 lg:self-start">
                <SeccionCard>
                  <SeccionTitulo className="mb-2">Categoría</SeccionTitulo>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS_OPTIONS.map((cat) => {
                      const esSeleccionado = form.categoria === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={formDeshabilitado}
                          onClick={() => handleDirectChange('categoria', cat.id)}
                          className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition ${
                            esSeleccionado
                              ? 'border-brand-500 bg-brand-50 text-brand-800 font-semibold ring-2 ring-brand-100'
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
                </SeccionCard>

                <SeccionCard>
                  <SeccionTitulo className="mb-2">Prioridad</SeccionTitulo>
                  <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
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
                          className={`flex-1 rounded-lg py-2 text-center text-xs transition ${
                            esSeleccionado
                              ? estiloActivo
                              : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                          }`}
                        >
                          {prio}
                        </button>
                      )
                    })}
                  </div>
                </SeccionCard>

                {esEdicion && (
                  <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-800">
                    <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                    <p>
                      La gestión de estados y el seguimiento se hace desde{' '}
                      <span className="font-semibold">Gestionar</span>.
                    </p>
                  </div>
                )}

                {submitError && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {submitError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting || subiendoImagenes}
            >
              {guardado ? 'Cerrar' : 'Cancelar'}
            </Button>
            <Button
              type="submit"
              loading={submitting || subiendoImagenes}
              disabled={submitting || subiendoImagenes || formDeshabilitado}
              className="border-none bg-brand-600 text-white hover:bg-brand-700"
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
    </div>
  )
}