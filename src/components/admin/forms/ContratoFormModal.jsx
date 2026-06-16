import { useEffect, useMemo, useState } from 'react'
import { Button } from '@tremor/react'
import {
  calcularPreviewAumentos,
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
import AdminSearchSelect from '../AdminSearchSelect'
import ContratoDocumentoAltaPicker from './ContratoDocumentoAltaPicker'
import InquilinoDetalleModal from '../InquilinoDetalleModal'
import PropiedadDetalleModal from '../PropiedadDetalleModal'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

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
    return <p className="text-sm text-amber-700">La fecha de fin debe ser posterior al inicio.</p>
  }

  if (preview.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay aumentos previstos dentro de la vigencia con esta periodicidad.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {preview.map((fila) => (
        <li
          key={`${fila.numero}-${fila.fecha}`}
          className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
        >
          <span className="font-medium text-slate-700">{fila.numero}º</span>
          <span className="text-slate-600">{formatFecha(fila.fecha)}</span>
          <span className="text-right text-slate-800">
            {fila.esMontoNumerico ? formatMonto(fila.montoEstimado) : fila.montoEstimado}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CampoResumen({ label, value }) {
  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-slate-700">{label}</p>
      <p className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900">{value}</p>
    </div>
  )
}

function StepperProgreso({ secciones, activa }) {
  return (
    <div
      className="flex items-center justify-center border-b border-slate-200 px-4 py-5 sm:px-6"
      aria-label="Progreso del formulario"
    >
      {secciones.map((sec, i) => (
        <div key={sec.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              aria-current={i === activa ? 'step' : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < activa
                  ? 'bg-indigo-600 text-white'
                  : i === activa
                    ? 'border-2 border-indigo-600 bg-white text-indigo-700'
                    : 'border-2 border-slate-200 bg-white text-slate-400'
              }`}
            >
              {i < activa ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`max-w-[4.5rem] text-center text-[10px] font-semibold uppercase leading-tight sm:max-w-none sm:text-xs ${
                i === activa ? 'text-indigo-700' : i < activa ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {sec.stepLabel ?? sec.label}
            </span>
          </div>
          {i < secciones.length - 1 && (
            <div
              className={`mx-1 mb-5 h-0.5 w-6 sm:mx-2 sm:w-10 ${i < activa ? 'bg-indigo-500' : 'bg-slate-200'}`}
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
      <p className="mb-1 block text-sm font-medium text-slate-700">Próximos aumentos</p>
      <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
        <PanelProximosAumentos preview={preview} fechaInicio={fechaInicio} fechaFin={fechaFin} />
      </div>
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
      }),
    [form, periodicidadMeses]
  )

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
      fecha_fin: recalcularFechaFin(fechaInicio, prev.duracion_anios),
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
      if (!form.fecha_inicio || !form.fecha_fin) return 'Completá las fechas de vigencia.'
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
  const mostrarPanelLateral = esSeccionAjustes

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-[min(720px,92vh)] max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Agregar contrato</h2>
          <p className="mt-1 text-sm text-slate-500">Completá las secciones para registrar el alquiler</p>
        </div>

        <StepperProgreso secciones={SECCIONES_CONTRATO} activa={seccionActiva} />

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <div
              className={`min-w-0 flex-1 p-6 pb-8 ${mostrarPanelLateral ? 'lg:pr-4' : ''} ${seccionActiva === 0 ? 'flex flex-col' : ''}`}
            >
              {seccionActiva === 0 && (
                <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-5">
                  <div>
                    {inquilinosLoading ? (
                      <p className="text-sm text-slate-500">Cargando inquilinos...</p>
                    ) : sinInquilinos ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
                        emptySelectionLabel="Buscar inquilino..."
                        searchPlaceholder="Buscar inquilino..."
                        disabled={formDeshabilitado}
                        onVerDetalle={() => setDetalleInquilinoOpen(true)}
                      />
                    )}
                  </div>

                  <div>
                    {propiedadesLoading ? (
                      <p className="text-sm text-slate-500">Cargando propiedades...</p>
                    ) : sinPropiedades ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        No hay propiedades cargadas. Creá una antes de agregar un contrato.
                      </p>
                    ) : sinPropiedadesElegibles ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
                          emptySelectionLabel="Buscar propiedad..."
                          searchPlaceholder="Buscar propiedad..."
                          disabled={formDeshabilitado}
                          onVerDetalle={() => setDetallePropiedadOpen(true)}
                        />
                        {propiedadNoDisponible && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            {MENSAJE_PROPIEDAD_NO_DISPONIBLE}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {seccionActiva === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fecha_inicio" className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha inicio de vigencia
                      </label>
                      <input
                        id="fecha_inicio"
                        type="date"
                        required
                        value={form.fecha_inicio}
                        onChange={handleFechaInicio}
                        className={inputClass}
                        disabled={formDeshabilitado}
                      />
                    </div>
                    <div>
                      <label htmlFor="duracion_anios" className="mb-1 block text-sm font-medium text-slate-700">
                        Duración del contrato
                      </label>
                      <select
                        id="duracion_anios"
                        value={form.duracion_anios}
                        onChange={handleDuracion}
                        className={inputClass}
                        disabled={formDeshabilitado}
                      >
                        {DURACION_CONTRATO_OPCIONES.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="fecha_fin" className="mb-1 block text-sm font-medium text-slate-700">
                      Fecha fin (calculada)
                    </label>
                    <input
                      id="fecha_fin"
                      type="date"
                      readOnly
                      value={form.fecha_fin}
                      className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-700`}
                      disabled={formDeshabilitado}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Plazo cerrado: inicio + duración − 1 día.
                    </p>
                  </div>

                  {solapaConContratoExistente && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {MENSAJE_SOLAPAMIENTO_CONTRATO}
                    </p>
                  )}

                  <div>
                    <label htmlFor="monto_alquiler" className="mb-1 block text-sm font-medium text-slate-700">
                      Monto de alquiler (vigente al inicio)
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
                    <p className="mt-1 text-xs text-slate-500">
                      Será el monto inicial y el vigente hasta el primer aumento.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="dia_vencimiento" className="mb-1 block text-sm font-medium text-slate-700">
                      Día de vencimiento (opcional)
                    </label>
                    <input
                      id="dia_vencimiento"
                      type="number"
                      min="1"
                      max="28"
                      value={form.dia_vencimiento}
                      onChange={handleChange('dia_vencimiento')}
                      className={inputClass}
                      placeholder="10"
                      disabled={formDeshabilitado}
                    />
                  </div>
                </div>
              )}

              {seccionActiva === 2 && (
                <div className="space-y-4 lg:max-w-xl">
                  <div>
                    <label htmlFor="periodicidad_key" className="mb-1 block text-sm font-medium text-slate-700">
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
                      <p className="mt-1 text-xs text-slate-500">
                        Primer ajuste estimado: {formatFecha(fechaProximoAumento)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="tipo_ajuste" className="mb-1 block text-sm font-medium text-slate-700">
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
                    <label htmlFor="observaciones" className="mb-1 block text-sm font-medium text-slate-700">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      id="observaciones"
                      rows={3}
                      value={form.observaciones}
                      onChange={handleChange('observaciones')}
                      className={inputClass}
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
                </div>
              )}

              {seccionActiva === 3 && (
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
              )}

              {seccionActiva === 4 && (
                <div className="space-y-4">
                  <CampoResumen label="Inquilino" value={inquilinoSeleccionado?.nombre_completo ?? '—'} />
                  <CampoResumen label="Propiedad" value={propiedadSeleccionada?.direccion ?? '—'} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CampoResumen label="Fecha inicio" value={formatFecha(form.fecha_inicio)} />
                    <CampoResumen
                      label="Duración"
                      value={
                        DURACION_CONTRATO_OPCIONES.find((o) => o.key === form.duracion_anios)?.label ??
                        '—'
                      }
                    />
                  </div>
                  <CampoResumen label="Fecha fin" value={formatFecha(form.fecha_fin)} />
                  <CampoResumen
                    label="Monto inicial / vigente"
                    value={formatMonto(Number(form.monto_alquiler))}
                  />
                  <CampoResumen
                    label="Día de vencimiento"
                    value={form.dia_vencimiento ? `Día ${form.dia_vencimiento}` : '—'}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CampoResumen label="Periodicidad del ajuste" value={periodicidadLabel} />
                    <CampoResumen
                      label="Tipo de ajuste"
                      value={TIPO_AJUSTE_LABELS[form.tipo_ajuste] ?? form.tipo_ajuste}
                    />
                  </div>
                  <CampoResumen
                    label="Próximo aumento"
                    value={fechaProximoAumento ? formatFecha(fechaProximoAumento) : '—'}
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
                  <BloqueProximosAumentos
                    preview={preview}
                    fechaInicio={form.fecha_inicio}
                    fechaFin={form.fecha_fin}
                  />
                </div>
              )}

              {errorPaso && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{errorPaso}</p>
              )}
              {submitError && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
              )}
            </div>

            {mostrarPanelLateral && (
              <aside className="hidden w-72 shrink-0 border-l border-slate-200 p-4 lg:block">
                <BloqueProximosAumentos
                  preview={preview}
                  fechaInicio={form.fecha_inicio}
                  fechaFin={form.fecha_fin}
                />
              </aside>
            )}
          </div>

          <div className="flex justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <div className="flex gap-3">
              {seccionActiva > 0 && (
                <Button type="button" variant="secondary" onClick={irAnterior} disabled={submitting}>
                  Anterior
                </Button>
              )}
              {!esUltimaSeccion ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    irSiguiente()
                  }}
                  disabled={submitting || formDeshabilitado || (seccionActiva === 0 && propiedadSeleccionadaNoElegible)}
                >
                  {seccionActiva === SECCIONES_CONTRATO.length - 2 ? 'Ver resumen' : 'Siguiente'}
                </Button>
              ) : (
                <Button type="submit" loading={submitting} disabled={submitting || formDeshabilitado}>
                  Confirmar y guardar
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>

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
