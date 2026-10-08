import { useEffect, useMemo, useState } from 'react'
import {
  calcularPreviewAumentos,
  etiquetaCantidadAumentos,
  fechasValidas,
  periodicidadMesesPorKey,
  primeraFechaAumento,
  TIPO_AJUSTE_LABELS,
  TIPO_AJUSTE_OPCIONES,
} from '../../../utils/contratoAumentosPreview'
import { formContratoInicial, PERIODICIDAD_OPCIONES, SECCIONES_CONTRATO } from '../../../utils/contratoFormConstants'
import {
  etiquetaPropiedadParaContrato,
  MENSAJE_PROPIEDAD_CONTRATO_ACTIVO,
  MENSAJE_PROPIEDAD_NO_DISPONIBLE,
  MENSAJE_SOLAPAMIENTO_CONTRATO,
  propiedadElegibleParaContrato,
} from '../../../utils/propiedadElegibleContrato'
import {
  calcularFechaFinPorDuracion,
  contratoComprometePropiedad,
  DURACION_CONTRATO_OPCIONES,
  fechasSeSolapan,
} from '../../../utils/contratoVigencia'
import { formatearMontoInput, parsearMontoInput } from '../../../utils/formatoMonto'
import { formatPeriodoMesAnio } from '../../../utils/aumentosUi'
import AdminSearchSelect from '../AdminSearchSelect'
import AdminFormModalHeader from '../AdminFormModalHeader'
import ContratoDocumentoAltaPicker from './ContratoDocumentoAltaPicker'
import InquilinoDetalleModal from '../InquilinoDetalleModal'
import PropiedadDetalleModal from '../PropiedadDetalleModal'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import { IconCheck, IconChevronLeft, IconChevronRight } from '../../icons/Icons'
import {
  calloutClass,
  cn,
  fieldHintClass,
  inputClass as inputBaseClass,
  labelClass,
  modalFooterClass,
  modalFormClass,
  surfaceMuted,
  textareaClass,
} from '../../../utils/ui'

const inputClass = inputBaseClass

const inputClassSinSpinner = cn(
  inputBaseClass,
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
)

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function PanelProximosAumentos({ preview, fechaInicio, fechaFin }) {
  if (!fechaInicio || !fechaFin) {
    return (
      <p className="text-sm text-slate-500">Completá las fechas de vigencia para ver el calendario de aumentos.</p>
    )
  }

  if (!fechasValidas(fechaInicio, fechaFin)) {
    return <p className="text-sm text-amber-800">La fecha de fin debe ser posterior al inicio.</p>
  }

  if (preview.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay aumentos previstos dentro de la vigencia con esta periodicidad.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-200/70">
      {preview.map((fila) => (
        <li
          key={`${fila.numero}-${fila.fecha}`}
          className="flex items-start justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
        >
          <span className="w-6 shrink-0 tabular-nums text-slate-400">{fila.numero}º</span>
          <span className="flex-1 text-slate-600">{formatPeriodoMesAnio(fila.fecha)}</span>
          <span className="text-right tabular-nums text-slate-900">
            {fila.esMontoNumerico ? formatMonto(fila.montoEstimado) : fila.montoEstimado}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CampoResumen({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function StepperProgreso({ secciones, activa }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center border-b border-slate-100 px-4 py-4 sm:px-6"
      aria-label="Progreso del formulario"
    >
      {secciones.map((sec, i) => (
        <div key={sec.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              aria-current={i === activa ? 'step' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors ${
                i < activa
                  ? 'bg-brand-600 text-white'
                  : i === activa
                    ? 'bg-white text-brand-700 ring-2 ring-brand-600'
                    : 'bg-white text-slate-400 ring-1 ring-slate-300'
              }`}
            >
              {i < activa ? (
                <IconCheck className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`max-w-[4.5rem] text-center text-xs leading-tight sm:max-w-none ${
                i === activa ? 'font-medium text-slate-900' : i < activa ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {sec.stepLabel ?? sec.label}
            </span>
          </div>
          {i < secciones.length - 1 && (
            <div
              className={`mx-1 mb-5 h-px w-6 sm:mx-2 sm:w-12 ${i < activa ? 'bg-brand-500' : 'bg-slate-200'}`}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  )
}

function BloqueProximosAumentos({ preview, fechaInicio, fechaFin }) {
  return (
    <div>
      <p className={labelClass}>Próximos aumentos</p>
      <div className={`${surfaceMuted} px-4 py-3`}>
        <PanelProximosAumentos preview={preview} fechaInicio={fechaInicio} fechaFin={fechaFin} />
      </div>
    </div>
  )
}

function ContenidoPasoWizard({ children, className = '' }) {
  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col justify-center space-y-3 lg:max-w-xl ${className}`}
    >
      {children}
    </div>
  )
}

export default function ContratoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  inquilinos,
  inquilinosLoading,
  propiedades,
  propiedadesLoading,
  contratos = [],
}) {
  const [form, setForm] = useState(formContratoInicial)
  const [seccionActiva, setSeccionActiva] = useState(0)
  const [errorPaso, setErrorPaso] = useState(null)
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)
  const [archivoLegal, setArchivoLegal] = useState(null)
  const [errorArchivoLegal, setErrorArchivoLegal] = useState(null)

  useEffect(() => {
    if (!open) {
      setForm(formContratoInicial)
      setSeccionActiva(0)
      setErrorPaso(null)
      setDetalleInquilinoOpen(false)
      setDetallePropiedadOpen(false)
      setArchivoLegal(null)
      setErrorArchivoLegal(null)
    }
  }, [open])

  const periodicidadMeses = periodicidadMesesPorKey(form.periodicidad_key)
  const periodicidadLabel =
    PERIODICIDAD_OPCIONES.find((o) => o.key === form.periodicidad_key)?.label ?? 'Anual'

  const propiedadesElegibles = useMemo(
    () => propiedades.filter((p) => propiedadElegibleParaContrato(p)),
    [propiedades]
  )

  const solapaConContratoExistente = useMemo(() => {
    if (!form.propiedad_id || !form.fecha_inicio || !form.fecha_fin) return false
    return contratos.some(
      (c) =>
        contratoComprometePropiedad(c) &&
        String(c.propiedad_id) === String(form.propiedad_id) &&
        fechasSeSolapan(form.fecha_inicio, form.fecha_fin, c.fecha_inicio, c.fecha_fin)
    )
  }, [contratos, form.propiedad_id, form.fecha_inicio, form.fecha_fin])

  const preview = useMemo(
    () =>
      calcularPreviewAumentos({
        fechaInicio: form.fecha_inicio,
        fechaFin: form.fecha_fin,
        periodicidadMeses,
        tipoAjuste: form.tipo_ajuste,
        maxFilas: 120,
      }),
    [form, periodicidadMeses]
  )

  const cantidadAumentos = preview.length

  const fechaProximoAumento = primeraFechaAumento(form.fecha_inicio, periodicidadMeses)

  const inquilinoSeleccionado = inquilinos.find((i) => String(i.id) === String(form.inquilino_id))
  const propiedadSeleccionada = propiedades.find((p) => String(p.id) === String(form.propiedad_id))
  const propiedadNoDisponible =
    Boolean(propiedadSeleccionada) && propiedadSeleccionada.estado !== 'Disponible'
  const propiedadSeleccionadaNoElegible =
    Boolean(propiedadSeleccionada) && !propiedadElegibleParaContrato(propiedadSeleccionada)

  if (!open) return null

  const recalcularFechaFin = (fechaInicio, duracionAnios) => {
    const anios = Number(duracionAnios)
    if (!fechaInicio || !anios) return ''
    return calcularFechaFinPorDuracion(fechaInicio, anios)
  }

  const handleFechaInicio = (e) => {
    setErrorPaso(null)
    const fechaInicio = e.target.value
    setForm((prev) => ({
      ...prev,
      fecha_inicio: fechaInicio,
      duracion_anios: fechaInicio ? prev.duracion_anios : '',
      fecha_fin: fechaInicio ? recalcularFechaFin(fechaInicio, prev.duracion_anios) : '',
    }))
  }

  const handleDuracion = (e) => {
    setErrorPaso(null)
    const duracionAnios = e.target.value
    setForm((prev) => ({
      ...prev,
      duracion_anios: duracionAnios,
      fecha_fin: recalcularFechaFin(prev.fecha_inicio, duracionAnios),
    }))
  }

  const handleMonto = (e) => {
    setErrorPaso(null)
    const display = formatearMontoInput(e.target.value)
    const monto = parsearMontoInput(display)
    setForm((prev) => ({
      ...prev,
      monto_alquiler_display: display,
      monto_alquiler: monto === '' ? '' : String(monto),
    }))
  }

  const handleChange = (field) => (e) => {
    setErrorPaso(null)
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const sinInquilinos = !inquilinosLoading && inquilinos.length === 0
  const sinPropiedades = !propiedadesLoading && propiedades.length === 0
  const sinPropiedadesElegibles = !propiedadesLoading && propiedadesElegibles.length === 0
  const formDeshabilitado = sinInquilinos || sinPropiedadesElegibles

  const validarPaso = (indice) => {
    if (indice === 0) {
      if (!form.inquilino_id || !form.propiedad_id) return 'Seleccioná inquilino y propiedad.'
      if (propiedadNoDisponible) return MENSAJE_PROPIEDAD_NO_DISPONIBLE
      return null
    }
    if (indice === 1) {
      if (!form.fecha_inicio) return 'Completá la fecha de inicio de vigencia.'
      if (!form.duracion_anios) return 'Seleccioná la duración del contrato.'
      if (!form.fecha_fin) return 'Completá las fechas de vigencia.'
      if (!fechasValidas(form.fecha_inicio, form.fecha_fin)) {
        return 'La fecha de fin debe ser posterior a la de inicio.'
      }
      if (solapaConContratoExistente) return MENSAJE_SOLAPAMIENTO_CONTRATO
      if (!form.monto_alquiler || Number(form.monto_alquiler) <= 0) {
        return 'Ingresá un monto de alquiler válido.'
      }
      if (form.dia_vencimiento) {
        const dia = Number(form.dia_vencimiento)
        if (dia < 1 || dia > 28) return 'El día de vencimiento debe estar entre 1 y 28.'
      }
      return null
    }
    if (indice === 2) {
      if (!fechaProximoAumento) return 'No se pudo calcular el próximo aumento. Revisá las fechas.'
      if (form.fecha_fin && fechaProximoAumento > form.fecha_fin) {
        return 'El primer ajuste cae fuera de la vigencia del contrato. Revisá la periodicidad o la duración.'
      }
      return null
    }
    return null
  }

  const irSiguiente = () => {
    const err = validarPaso(seccionActiva)
    if (err) {
      setErrorPaso(err)
      return
    }
    setErrorPaso(null)
    setSeccionActiva((s) => Math.min(s + 1, SECCIONES_CONTRATO.length - 1))
  }

  const irAnterior = () => {
    setErrorPaso(null)
    setSeccionActiva((s) => Math.max(s - 1, 0))
  }

  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (seccionActiva < SECCIONES_CONTRATO.length - 1) {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (seccionActiva !== SECCIONES_CONTRATO.length - 1) {
      return
    }

    for (let i = 0; i <= 2; i += 1) {
      const err = validarPaso(i)
      if (err) {
        setErrorPaso(err)
        setSeccionActiva(i)
        return
      }
    }

    const ok = await onSubmit({
      ...form,
      periodicidad_meses: periodicidadMeses,
      fecha_proximo_aumento: fechaProximoAumento,
      monto_inicial: Number(form.monto_alquiler),
      archivo_legal: archivoLegal,
      documento_visible_inquilino: form.documento_visible_inquilino,
    })
    if (ok) onClose()
  }

  const esUltimaSeccion = seccionActiva === SECCIONES_CONTRATO.length - 1
  const esSeccionAjustes = seccionActiva === 2
  const esSeccionResumen = esUltimaSeccion
  const tamanoFijoWizard = !esSeccionResumen
  const mostrarPanelLateral = esSeccionAjustes

  return (
    <>
      <Modal
        open={open}
        onClose={submitting ? undefined : onClose}
        size="4xl"
        className={tamanoFijoWizard ? 'h-[min(640px,calc(100dvh-2rem))]' : ''}
      >
        <AdminFormModalHeader
          title="Nuevo contrato"
          subtitle={`Paso ${seccionActiva + 1} de ${SECCIONES_CONTRATO.length}`}
          onClose={submitting ? undefined : onClose}
        />

        <StepperProgreso secciones={SECCIONES_CONTRATO} activa={seccionActiva} />

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className={modalFormClass}
        >
          <div className={`flex min-h-0 flex-1 ${tamanoFijoWizard ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <div
              className={`flex min-w-0 flex-1 flex-col ${
                tamanoFijoWizard ? 'px-6 py-5' : 'px-6 pb-8 pt-5'
              } ${esSeccionAjustes ? 'lg:pr-4' : ''}`}
            >
              {seccionActiva === 0 && (
                <ContenidoPasoWizard className="max-w-md lg:max-w-md">
                  <div>
                    {inquilinosLoading ? (
                      <p className="text-sm text-slate-500">Cargando inquilinos…</p>
                    ) : sinInquilinos ? (
                      <p className={calloutClass('warning')}>
                        No hay inquilinos cargados. Creá uno antes de agregar un contrato.
                      </p>
                    ) : (
                      <AdminSearchSelect
                        id="inquilino_id"
                        label="Inquilino"
                        required
                        value={form.inquilino_id}
                        onChange={(id) => {
                          setErrorPaso(null)
                          setForm((prev) => ({ ...prev, inquilino_id: id }))
                        }}
                        options={inquilinos.map((i) => ({
                          value: i.id,
                          label: i.nombre_completo,
                        }))}
                        emptySelectionLabel="Buscar inquilino…"
                        searchPlaceholder="Buscar inquilino…"
                        disabled={formDeshabilitado}
                        onVerDetalle={() => setDetalleInquilinoOpen(true)}
                        verDetalleLabel="Ver ficha del inquilino"
                      />
                    )}
                  </div>

                  <div>
                    {propiedadesLoading ? (
                      <p className="text-sm text-slate-500">Cargando propiedades…</p>
                    ) : sinPropiedades ? (
                      <p className={calloutClass('warning')}>
                        No hay propiedades cargadas. Creá una antes de agregar un contrato.
                      </p>
                    ) : sinPropiedadesElegibles ? (
                      <p className={calloutClass('warning')}>
                        No hay propiedades disponibles. Solo podés contratar unidades en estado
                        Disponible y sin contrato activo.
                      </p>
                    ) : (
                      <>
                        <AdminSearchSelect
                          id="propiedad_id"
                          label="Propiedad"
                          required
                          value={form.propiedad_id}
                          onChange={(id) => {
                            setErrorPaso(null)
                            setForm((prev) => ({ ...prev, propiedad_id: id }))
                          }}
                          options={propiedades.map((p) => {
                            const elegible = propiedadElegibleParaContrato(p)
                            return {
                              value: p.id,
                              label: etiquetaPropiedadParaContrato(p),
                              disabled: !elegible,
                            }
                          })}
                          emptySelectionLabel="Buscar propiedad…"
                          searchPlaceholder="Buscar propiedad…"
                          disabled={formDeshabilitado}
                          onVerDetalle={() => setDetallePropiedadOpen(true)}
                          verDetalleLabel="Ver ficha de la propiedad"
                        />
                        {propiedadNoDisponible && (
                          <p className={calloutClass('warning', 'mt-2')}>
                            {MENSAJE_PROPIEDAD_NO_DISPONIBLE}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </ContenidoPasoWizard>
              )}

              {seccionActiva === 1 && (
                <ContenidoPasoWizard>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fecha_inicio" className={labelClass}>
                        Fecha inicio de vigencia
                      </label>
                      <input
                        id="fecha_inicio"
                        type="date"
                        required
                        value={form.fecha_inicio}
                        onChange={handleFechaInicio}
                        className={inputClassSinSpinner}
                        disabled={formDeshabilitado}
                      />
                    </div>
                    <div>
                      <label htmlFor="duracion_anios" className={labelClass}>
                        Duración del contrato
                      </label>
                      {!form.fecha_inicio ? (
                        <div
                          id="duracion_anios"
                          className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-400`}
                          aria-disabled="true"
                        >
                          Seleccionar duración
                        </div>
                      ) : (
                        <select
                          id="duracion_anios"
                          value={form.duracion_anios}
                          onChange={handleDuracion}
                          className={`${inputClass} text-slate-900`}
                          disabled={formDeshabilitado}
                        >
                          <option value="" disabled hidden>
                            Seleccionar duración
                          </option>
                          {DURACION_CONTRATO_OPCIONES.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {form.fecha_inicio && form.duracion_anios && form.fecha_fin && (
                    <div>
                      <label htmlFor="fecha_fin" className={labelClass}>
                        Fecha fin (calculada)
                      </label>
                      <input
                        id="fecha_fin"
                        type="date"
                        readOnly
                        value={form.fecha_fin}
                        className={`${inputClassSinSpinner} cursor-not-allowed bg-slate-50 text-slate-700`}
                        disabled={formDeshabilitado}
                        tabIndex={-1}
                      />
                    </div>
                  )}

                  {solapaConContratoExistente && (
                    <p className={calloutClass('warning')}>
                      {MENSAJE_SOLAPAMIENTO_CONTRATO}
                    </p>
                  )}

                  <div>
                    <label htmlFor="monto_alquiler" className={labelClass}>
                      Monto de alquiler
                    </label>
                    <input
                      id="monto_alquiler"
                      type="text"
                      inputMode="numeric"
                      required
                      value={form.monto_alquiler_display}
                      onChange={handleMonto}
                      className={inputClass}
                      placeholder="$ 350.000"
                      disabled={formDeshabilitado}
                    />
                  </div>

                  <div>
                    <label htmlFor="dia_vencimiento" className={labelClass}>
                      Día de vencimiento (opcional)
                    </label>
                    <input
                      id="dia_vencimiento"
                      type="text"
                      inputMode="numeric"
                      value={form.dia_vencimiento}
                      onChange={handleChange('dia_vencimiento')}
                      className={inputClass}
                      placeholder="10"
                      disabled={formDeshabilitado}
                    />
                  </div>
                </ContenidoPasoWizard>
              )}

              {seccionActiva === 2 && (
                <ContenidoPasoWizard>
                  <p className={calloutClass('info')}>
                    La periodicidad y el tipo de ajuste definen todos los aumentos futuros del contrato. Revisá
                    el calendario antes de continuar.
                  </p>

                  <div>
                    <label htmlFor="periodicidad_key" className={labelClass}>
                      Periodicidad del ajuste
                    </label>
                    <select
                      id="periodicidad_key"
                      value={form.periodicidad_key}
                      onChange={handleChange('periodicidad_key')}
                      className={inputClass}
                    >
                      {PERIODICIDAD_OPCIONES.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {fechaProximoAumento && (
                      <p className={fieldHintClass}>
                        Primer ajuste estimado: {formatPeriodoMesAnio(fechaProximoAumento)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="tipo_ajuste" className={labelClass}>
                      Tipo de ajuste
                    </label>
                    <select
                      id="tipo_ajuste"
                      value={form.tipo_ajuste}
                      onChange={handleChange('tipo_ajuste')}
                      className={inputClass}
                    >
                      {TIPO_AJUSTE_OPCIONES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="observaciones" className={labelClass}>
                      Observaciones (opcional)
                    </label>
                    <textarea
                      id="observaciones"
                      rows={2}
                      value={form.observaciones}
                      onChange={handleChange('observaciones')}
                      className={cn(textareaClass, 'min-h-0 resize-none')}
                      placeholder="Cláusulas o notas del contrato"
                    />
                  </div>

                  <div className="lg:hidden">
                    <BloqueProximosAumentos
                      preview={preview}
                      fechaInicio={form.fecha_inicio}
                      fechaFin={form.fecha_fin}
                    />
                  </div>
                </ContenidoPasoWizard>
              )}

              {seccionActiva === 3 && (
                <ContenidoPasoWizard className="max-w-2xl lg:max-w-2xl">
                  <ContratoDocumentoAltaPicker
                  archivo={archivoLegal}
                  onArchivoChange={setArchivoLegal}
                  visibleParaInquilino={form.documento_visible_inquilino}
                  onVisibleChange={(value) =>
                    setForm((prev) => ({ ...prev, documento_visible_inquilino: value }))
                  }
                  error={errorArchivoLegal}
                  onErrorChange={setErrorArchivoLegal}
                  disabled={submitting}
                />
                </ContenidoPasoWizard>
              )}

              {seccionActiva === 4 && (
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  <CampoResumen label="Inquilino" value={inquilinoSeleccionado?.nombre_completo ?? '—'} />
                  <CampoResumen label="Propiedad" value={propiedadSeleccionada?.direccion ?? '—'} />
                  <CampoResumen
                    label="Propietario"
                    value={propiedadSeleccionada?.propietarios?.nombre_completo ?? '—'}
                  />
                  <CampoResumen label="Fecha inicio" value={formatFecha(form.fecha_inicio)} />
                  <CampoResumen
                    label="Duración"
                    value={DURACION_CONTRATO_OPCIONES.find((o) => o.key === form.duracion_anios)?.label ?? '—'}
                  />
                  <CampoResumen label="Fecha fin" value={formatFecha(form.fecha_fin)} />
                  <CampoResumen
                    label="Monto inicial / vigente"
                    value={formatMonto(Number(form.monto_alquiler))}
                  />
                  <CampoResumen
                    label="Día de vencimiento"
                    value={form.dia_vencimiento ? `Día ${form.dia_vencimiento}` : '—'}
                  />
                  <CampoResumen label="Periodicidad del ajuste" value={periodicidadLabel} />
                  <CampoResumen label="Tipo de ajuste" value={TIPO_AJUSTE_LABELS[form.tipo_ajuste] ?? form.tipo_ajuste} />
                  <CampoResumen
                    label="Próximo aumento"
                    value={fechaProximoAumento ? formatPeriodoMesAnio(fechaProximoAumento) : '—'}
                  />
                  <CampoResumen
                    label="Aumentos en el plazo"
                    value={etiquetaCantidadAumentos(cantidadAumentos)}
                  />
                  <CampoResumen label="Observaciones" value={form.observaciones?.trim() || '—'} />
                  <CampoResumen
                    label="Contrato legal adjunto"
                    value={
                      archivoLegal
                        ? `${archivoLegal.name}${form.documento_visible_inquilino ? ' · Visible inquilino' : ' · Solo admin'}`
                        : 'Sin adjuntar (opcional)'
                    }
                  />
                </dl>
              )}
              {seccionActiva === 4 && (
                <div className="mt-5">
                  <BloqueProximosAumentos
                    preview={preview}
                    fechaInicio={form.fecha_inicio}
                    fechaFin={form.fecha_fin}
                  />
                </div>
              )}

              {errorPaso && (
                <p className={calloutClass('warning', 'mt-4')}>{errorPaso}</p>
              )}
              {submitError && (
                <p className={calloutClass('danger', 'mt-4')}>{submitError}</p>
              )}
            </div>

            {mostrarPanelLateral && (
              <aside className="hidden w-72 shrink-0 self-stretch overflow-y-auto border-l border-slate-100 p-5 lg:block">
                <BloqueProximosAumentos
                  preview={preview}
                  fechaInicio={form.fecha_inicio}
                  fechaFin={form.fecha_fin}
                />
              </aside>
            )}
          </div>

          <div className={cn(modalFooterClass, 'justify-between')}>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {seccionActiva > 0 && (
                <Button variant="secondary" icon={IconChevronLeft} onClick={irAnterior} disabled={submitting}>
                  Anterior
                </Button>
              )}
              {!esUltimaSeccion ? (
                <Button
                  iconRight={IconChevronRight}
                  onClick={(e) => {
                    e.preventDefault()
                    irSiguiente()
                  }}
                  disabled={submitting || formDeshabilitado || (seccionActiva === 0 && propiedadSeleccionadaNoElegible)}
                >
                  {seccionActiva === SECCIONES_CONTRATO.length - 2 ? 'Ver resumen' : 'Siguiente'}
                </Button>
              ) : (
                <Button type="submit" icon={IconCheck} loading={submitting} disabled={formDeshabilitado}>
                  Confirmar y guardar
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

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
    </>
  )
}
