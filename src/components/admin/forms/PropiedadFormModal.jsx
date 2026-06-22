import { useEffect, useMemo, useState } from 'react'
import { Button } from '@tremor/react'
import AdminSearchSelect from '../AdminSearchSelect'
import AdminFormModalHeader from '../AdminFormModalHeader'
import {
  TIPOS_PROPIEDAD,
  ESTADOS_PROPIEDAD_ALTA,
  CIUDADES_PROPIEDAD,
  CIUDAD_PROPIEDAD_DEFAULT,
  validarCalle,
  validarAltura,
  validarPiso,
  validarUnidad,
  validarCiudad,
} from '../../../utils/validaciones'

const formInicial = {
  propietario_id: '',
  calle: '',
  altura: '',
  piso: '',
  unidad: '',
  ciudad: CIUDAD_PROPIEDAD_DEFAULT,
  tipo: '',
  estado: 'Disponible',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const inputErrorClass =
  'w-full rounded-lg border border-red-400 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

const inputBloqueadoClass =
  'w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600'

const btnLimpiarSelect =
  'absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600'

function IconX({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function LabelCampo({ htmlFor, obligatorio = false, children, title }) {
  return (
    <label
      htmlFor={htmlFor}
      title={title}
      className="mb-1 flex h-5 items-center gap-0.5 text-sm font-medium leading-none text-slate-700"
    >
      <span className="truncate">{children}</span>
      {obligatorio && <span className="shrink-0 text-red-500">*</span>}
    </label>
  )
}

function tieneHistorialPropiedad(deps) {
  return (
    (deps.contratos_activos ?? 0) > 0 ||
    (deps.contratos_historicos ?? 0) > 0 ||
    (deps.reclamos ?? 0) > 0
  )
}

function formDesdePropiedad(propiedad) {
  const estado =
    propiedad.estado === 'Alquilada' ? 'Disponible' : (propiedad.estado ?? 'Disponible')

  return {
    propietario_id: propiedad.propietario_id != null ? String(propiedad.propietario_id) : '',
    calle: propiedad.calle ?? '',
    altura: propiedad.altura != null ? String(propiedad.altura) : '',
    piso: propiedad.piso != null ? String(propiedad.piso) : '',
    unidad: propiedad.unidad != null ? String(propiedad.unidad) : '',
    ciudad: CIUDADES_PROPIEDAD.includes(propiedad.ciudad)
      ? propiedad.ciudad
      : CIUDAD_PROPIEDAD_DEFAULT,
    tipo: propiedad.tipo ?? 'Departamento',
    estado: ESTADOS_PROPIEDAD_ALTA.includes(estado) ? estado : 'Disponible',
  }
}

export default function PropiedadFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  propiedad = null,
  propietarios,
  propietariosLoading,
  dependenciasPropiedad = null,
}) {
  const [form, setForm] = useState(formInicial)
  const [erroresCampo, setErroresCampo] = useState({})
  const esEdicion = Boolean(propiedad)
  const tieneContratoActivo = (dependenciasPropiedad?.contratos_activos ?? 0) > 0
  const identidadBloqueada = esEdicion && tieneHistorialPropiedad(dependenciasPropiedad ?? {})
  const esDepartamento = form.tipo === 'Departamento'
  const esCasa = form.tipo === 'Casa'
  const esLocalComercial = form.tipo === 'Local comercial'
  const tipoSeleccionado = TIPOS_PROPIEDAD.includes(form.tipo)
  const mostrarPisoUnidad = tipoSeleccionado && !esCasa
  const unidadRequerida = esDepartamento || esLocalComercial

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      setErroresCampo({})
      return
    }

    if (esEdicion) {
      const desdePropiedad = formDesdePropiedad(propiedad)
      setForm(
        tieneContratoActivo
          ? { ...desdePropiedad, estado: propiedad.estado ?? 'Alquilada' }
          : desdePropiedad
      )
    } else {
      setForm(formInicial)
    }
    setErroresCampo({})
  }, [open, propiedad, esEdicion, tieneContratoActivo])

  const opcionesPropietarios = useMemo(
    () =>
      propietarios.map((p) => ({
        value: p.id,
        label: p.nombre_completo,
      })),
    [propietarios]
  )

  const sinPropietarios = !propietariosLoading && propietarios.length === 0
  const formDeshabilitadoCrear = sinPropietarios && !esEdicion
  const estadoBloqueado = tieneContratoActivo && esEdicion
  const estadosOpciones = estadoBloqueado ? [form.estado] : ESTADOS_PROPIEDAD_ALTA
  const campoIdentidadClass = (tieneError) =>
    identidadBloqueada ? inputBloqueadoClass : tieneError ? inputErrorClass : inputClass

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (erroresCampo[field]) {
      setErroresCampo((prev) => ({ ...prev, [field]: null }))
    }
  }

  const limpiarTipo = () => {
    setForm((prev) => ({
      ...prev,
      tipo: '',
      calle: '',
      altura: '',
      piso: '',
      unidad: '',
      ciudad: CIUDAD_PROPIEDAD_DEFAULT,
    }))
    setErroresCampo((prev) => ({
      ...prev,
      tipo: null,
      calle: null,
      altura: null,
      piso: null,
      unidad: null,
      ciudad: null,
    }))
  }

  const validar = () => {
    const errores = {}

    if (!form.propietario_id) {
      errores.propietario_id = 'Debe seleccionar un propietario'
    }

    if (!tipoSeleccionado) {
      errores.tipo = 'Seleccioná un tipo de propiedad'
      return errores
    }

    const errCalle = validarCalle(form.calle)
    if (errCalle) errores.calle = errCalle

    const errAltura = validarAltura(form.altura)
    if (errAltura) errores.altura = errAltura

    const errPiso = mostrarPisoUnidad
      ? validarPiso(form.piso, { requerido: esDepartamento })
      : null
    if (errPiso) errores.piso = errPiso

    const errUnidad = mostrarPisoUnidad
      ? validarUnidad(form.unidad, {
          requerido: unidadRequerida,
          mensajeRequerido: esLocalComercial
            ? 'La unidad es obligatoria para locales comerciales (ej. Local 1)'
            : 'La unidad es obligatoria para departamentos',
        })
      : null
    if (errUnidad) errores.unidad = errUnidad

    const errCiudad = validarCiudad(form.ciudad)
    if (errCiudad) errores.ciudad = errCiudad

    return errores
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errores = validar()
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores)
      return
    }

    try {
      const identidadOriginal = propiedad ? formDesdePropiedad(propiedad) : null
      const datosEnvio = {
        ...form,
        ...(identidadBloqueada && identidadOriginal
          ? {
              tipo: identidadOriginal.tipo,
              calle: identidadOriginal.calle,
              altura: identidadOriginal.altura,
              piso: identidadOriginal.piso,
              unidad: identidadOriginal.unidad,
              ciudad: identidadOriginal.ciudad,
            }
          : {}),
        ...(estadoBloqueado && propiedad ? { estado: propiedad.estado ?? 'Alquilada' } : {}),
        piso: esCasa ? null : (form.piso ?? '').trim() || null,
        unidad: esCasa ? null : (form.unidad ?? '').trim() || null,
      }

      const ok = await onSubmit(datosEnvio)
      if (ok) onClose()
    } catch {
      setErroresCampo((prev) => ({
        ...prev,
        _general: 'Ocurrió un error al guardar. Intentá de nuevo.',
      }))
    }
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

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <AdminFormModalHeader title={esEdicion ? 'Editar Propiedad' : 'Nueva Propiedad'} />

        <form noValidate onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {esEdicion && identidadBloqueada && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {tieneContratoActivo
              ? 'Esta propiedad tiene un contrato activo. El estado, tipo y dirección están bloqueados. Si cambiás el propietario se pedirá confirmación.'
              : 'Esta propiedad tiene contratos o reclamos asociados. El tipo y la dirección no se pueden modificar.'}
          </div>
        )}

        <div className="space-y-4">
            {propietariosLoading ? (
              <p className="text-sm text-slate-500">Cargando propietarios...</p>
            ) : sinPropietarios ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay propietarios cargados. Creá uno antes de agregar una propiedad.
              </p>
            ) : (
              <AdminSearchSelect
                id="propietario_id"
                label="Propietario"
                value={form.propietario_id}
                onChange={(id) => {
                  setForm((prev) => ({ ...prev, propietario_id: id }))
                  if (erroresCampo.propietario_id) {
                    setErroresCampo((prev) => ({ ...prev, propietario_id: null }))
                  }
                }}
                options={opcionesPropietarios}
                emptySelectionLabel="Seleccioná un propietario"
                searchPlaceholder="Buscar propietario..."
                disabled={formDeshabilitadoCrear}
              />
            )}
            {erroresCampo.propietario_id && (
              <p className="mt-1 text-xs text-red-600">{erroresCampo.propietario_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <LabelCampo htmlFor="tipo" obligatorio>
                Tipo
              </LabelCampo>
              <div className="relative">
                <select
                  id="tipo"
                  value={form.tipo}
                  onChange={(e) => {
                    const nuevoTipo = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      tipo: nuevoTipo,
                      ...(nuevoTipo === 'Casa' ? { piso: '', unidad: '' } : {}),
                    }))
                    if (erroresCampo.tipo) {
                      setErroresCampo((prev) => ({ ...prev, tipo: null }))
                    }
                    if (nuevoTipo !== 'Departamento') {
                      setErroresCampo((prev) => ({ ...prev, piso: null }))
                    }
                    if (nuevoTipo !== 'Departamento' && nuevoTipo !== 'Local comercial') {
                      setErroresCampo((prev) => ({ ...prev, unidad: null }))
                    }
                  }}
                  className={`${campoIdentidadClass(erroresCampo.tipo)}${
                    tipoSeleccionado && !esEdicion ? ' pr-10' : ''
                  }`}
                  disabled={formDeshabilitadoCrear || identidadBloqueada}
                >
                  <option value="" disabled>
                    Seleccioná un tipo
                  </option>
                  {TIPOS_PROPIEDAD.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                {tipoSeleccionado && !esEdicion && !formDeshabilitadoCrear && (
                  <button
                    type="button"
                    aria-label="Quitar tipo seleccionado"
                    className={btnLimpiarSelect}
                    onClick={limpiarTipo}
                  >
                    <IconX />
                  </button>
                )}
              </div>
              {erroresCampo.tipo && (
                <p className="mt-1 text-xs text-red-600">{erroresCampo.tipo}</p>
              )}
            </div>

            <div>
              <LabelCampo htmlFor="estado" obligatorio>
                Estado
              </LabelCampo>
              <select
                id="estado"
                value={form.estado}
                onChange={handleChange('estado')}
                className={estadoBloqueado ? inputBloqueadoClass : inputClass}
                disabled={formDeshabilitadoCrear || estadoBloqueado}
              >
                {estadosOpciones.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tipoSeleccionado ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <LabelCampo htmlFor="calle" obligatorio title="Solo el nombre de la vía, sin número">
                Calle
              </LabelCampo>
              <input
                id="calle"
                type="text"
                maxLength={120}
                value={form.calle}
                onChange={handleChange('calle')}
                className={campoIdentidadClass(erroresCampo.calle)}
                placeholder="Bv. Chacabuco"
                disabled={formDeshabilitadoCrear || identidadBloqueada}
              />
              <p className="mt-1 text-xs text-slate-500">Sin número</p>
              {erroresCampo.calle && (
                <p className="mt-1 text-xs text-red-600">{erroresCampo.calle}</p>
              )}
            </div>

            <div className="sm:col-span-1">
              <LabelCampo htmlFor="altura" obligatorio>
                Altura
              </LabelCampo>
              <input
                id="altura"
                type="text"
                maxLength={10}
                value={form.altura}
                onChange={handleChange('altura')}
                className={campoIdentidadClass(erroresCampo.altura)}
                placeholder="4500"
                disabled={formDeshabilitadoCrear || identidadBloqueada}
              />
              {erroresCampo.altura && (
                <p className="mt-1 text-xs text-red-600">{erroresCampo.altura}</p>
              )}
            </div>

            {mostrarPisoUnidad && (
              <>
                <div className="sm:col-span-1">
                  <LabelCampo htmlFor="piso" obligatorio={esDepartamento}>
                    Piso
                  </LabelCampo>
                  <input
                    id="piso"
                    type="text"
                    maxLength={10}
                    value={form.piso}
                    onChange={handleChange('piso')}
                    className={campoIdentidadClass(erroresCampo.piso)}
                    placeholder={esDepartamento ? '3' : 'PB o vacío'}
                    disabled={formDeshabilitadoCrear || identidadBloqueada}
                  />
                  {erroresCampo.piso && (
                    <p className="mt-1 text-xs text-red-600">{erroresCampo.piso}</p>
                  )}
                </div>

                <div className="sm:col-span-1">
                  <LabelCampo
                    htmlFor="unidad"
                    obligatorio={unidadRequerida}
                    title={esLocalComercial ? 'Unidad o local (ej. Local 1)' : 'Unidad o depto (ej. B)'}
                  >
                    Unidad
                  </LabelCampo>
                  <input
                    id="unidad"
                    type="text"
                    maxLength={20}
                    value={form.unidad}
                    onChange={handleChange('unidad')}
                    className={campoIdentidadClass(erroresCampo.unidad)}
                    placeholder={esLocalComercial ? 'Local 1' : esDepartamento ? 'B' : 'Opcional'}
                    disabled={formDeshabilitadoCrear || identidadBloqueada}
                  />
                  {erroresCampo.unidad && (
                    <p className="mt-1 text-xs text-red-600">{erroresCampo.unidad}</p>
                  )}
                </div>
              </>
            )}

            <div className={mostrarPisoUnidad ? 'sm:col-span-1' : 'sm:col-span-3'}>
              <LabelCampo htmlFor="ciudad" obligatorio>
                Ciudad
              </LabelCampo>
              <select
                id="ciudad"
                value={form.ciudad}
                onChange={handleChange('ciudad')}
                className={campoIdentidadClass(erroresCampo.ciudad)}
                disabled={formDeshabilitadoCrear || identidadBloqueada}
              >
                {CIUDADES_PROPIEDAD.map((ciudad) => (
                  <option key={ciudad} value={ciudad}>
                    {ciudad}
                  </option>
                ))}
              </select>
              {erroresCampo.ciudad && (
                <p className="mt-1 text-xs text-red-600">{erroresCampo.ciudad}</p>
              )}
            </div>
          </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">Ubicación de la propiedad</p>
              <p className="mt-1 text-sm text-slate-500">
                Seleccioná el tipo para ver los campos de dirección
              </p>
            </div>
          )}

          {hayErroresCampo && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {erroresCampo._general ?? 'Revisá los campos marcados antes de guardar.'}
            </p>
          )}

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || formDeshabilitadoCrear}
            >
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
