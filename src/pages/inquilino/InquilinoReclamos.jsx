import { useState } from 'react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  badgeCategoria,
  badgePrioridad,
  CATEGORIAS_RECLAMO,
  PILL_SOLID_CLASS,
  PRIORIDADES_RECLAMO,
} from '../../utils/reclamosUi'

const estadoStyles = {
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-700' },
  'En Proceso': { bg: 'bg-blue-100', text: 'text-blue-700' },
  Resuelto: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

const formInicial = { titulo: '', descripcion: '', categoria: 'Plomeria', prioridad: 'Media' }

const formatFecha = (fechaStr) => {
  if (!fechaStr) return ''
  return new Date(fechaStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function InquilinoReclamos() {
  const {
    contratoActivo,
    reclamos,
    reclamosLoading,
    crearReclamo,
    actualizarReclamo,
    eliminarReclamo,
    submitting,
    submitError,
    limpiarSubmitError,
  } = usePortalInquilino()

  const [showForm, setShowForm] = useState(false)
  const [reclamoEditando, setReclamoEditando] = useState(null)
  const [form, setForm] = useState(formInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reclamoAEliminar, setReclamoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorAccion, setErrorAccion] = useState(null)

  const abrirFormCrear = () => {
    limpiarSubmitError()
    setReclamoEditando(null)
    setForm(formInicial)
    setShowForm(true)
  }

  const abrirFormEditar = (reclamo) => {
    limpiarSubmitError()
    setReclamoEditando(reclamo)
    setForm({
      titulo: reclamo.titulo ?? '',
      descripcion: reclamo.descripcion ?? '',
      categoria: reclamo.categoria ?? 'Plomeria',
      prioridad: reclamo.prioridad ?? 'Media',
    })
    setShowForm(true)
  }

  const cerrarForm = () => {
    if (submitting) return
    setShowForm(false)
    setReclamoEditando(null)
    setForm(formInicial)
    limpiarSubmitError()
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleDirectChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let ok
    if (reclamoEditando) {
      ok = await actualizarReclamo(reclamoEditando.id, form)
    } else {
      ok = await crearReclamo({
        ...form,
        propiedad_id: contratoActivo?.propiedad_id ?? null,
      })
    }
    if (ok) cerrarForm()
  }

  const handleEliminar = (reclamo) => {
    setReclamoAEliminar(reclamo)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setReclamoAEliminar(null)
  }

  const confirmarEliminar = async () => {
    if (!reclamoAEliminar) return
    setEliminando(true)
    const result = await eliminarReclamo(reclamoAEliminar.id)
    setEliminando(false)
    if (result.error) {
      setErrorAccion(result.error)
    }
    setConfirmOpen(false)
    setReclamoAEliminar(null)
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="relative space-y-5 pb-4">
      <h2 className="text-lg font-bold text-slate-800">Mis Reclamos</h2>

      {errorAccion && (
        <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{errorAccion}</p>
          <button
            type="button"
            onClick={() => setErrorAccion(null)}
            className="ml-3 shrink-0 text-sm font-medium text-red-600 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {reclamosLoading && (
        <p className="text-sm text-slate-500">Actualizando reclamos...</p>
      )}

      {reclamos.length === 0 && !reclamosLoading && (
        <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-700">No tenés reclamos registrados</p>
          <p className="mt-1 text-xs text-slate-400">
            {contratoActivo
              ? 'Usá el botón + para reportar un problema de mantenimiento'
              : 'Necesitás tener un contrato activo para registrar reclamos'}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {reclamos.map((r) => {
          const estilo = estadoStyles[r.estado] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
          const esPendiente = r.estado === 'Pendiente'
          const catBadge = badgeCategoria(r.categoria)
          const prioBadge = badgePrioridad(r.prioridad)

          return (
            <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{r.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatFecha(r.fecha_creacion)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo.bg} ${estilo.text}`}
                >
                  {r.estado}
                </span>
              </div>

              {(catBadge || prioBadge) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {catBadge && (
                    <span className={`${PILL_SOLID_CLASS} ${catBadge.className}`}>{catBadge.label}</span>
                  )}
                  {prioBadge && (
                    <span className={`${PILL_SOLID_CLASS} ${prioBadge.className}`}>{prioBadge.label}</span>
                  )}
                </div>
              )}

              {r.descripcion && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.descripcion}</p>
              )}

              {r.propiedades?.direccion && (
                <p className="mt-1.5 text-xs text-slate-400">{r.propiedades.direccion}</p>
              )}

              {esPendiente && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirFormEditar(r)}
                    className="flex-1 rounded-xl border border-indigo-200 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(r)}
                    className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* FAB — alineado al contenedor y por encima de la bottom nav */}
      {!showForm && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] z-40 px-4">
          <div className="mx-auto flex max-w-lg justify-end">
            <button
              type="button"
              onClick={abrirFormCrear}
              disabled={!contratoActivo}
              aria-label="Nuevo reclamo"
              title={!contratoActivo ? 'Necesitás un contrato activo para crear reclamos' : 'Nuevo reclamo'}
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reclamo-form-title"
        >
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="absolute inset-0"
            onClick={cerrarForm}
          />
          <div className="relative z-10 max-h-[min(85vh,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-100">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />

            <div className="relative mb-5 text-center">
              <h3 id="reclamo-form-title" className="text-lg font-bold text-slate-800">
                {reclamoEditando ? 'Editar reclamo' : 'Nuevo reclamo'}
              </h3>
              <button
                type="button"
                onClick={cerrarForm}
                disabled={submitting}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!reclamoEditando && contratoActivo?.propiedades?.direccion && (
              <p className="mb-5 rounded-xl bg-indigo-50 px-4 py-2.5 text-center text-xs font-medium leading-relaxed text-indigo-700">
                {contratoActivo.propiedades.direccion}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tipo de problema <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIAS_RECLAMO.map((cat) => {
                    const seleccionada = form.categoria === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDirectChange('categoria', cat.id)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition ${
                          seleccionada
                            ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700 ring-2 ring-indigo-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50'
                        }`}
                      >
                        <span className="text-base" aria-hidden="true">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Urgencia <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  {PRIORIDADES_RECLAMO.map((prio) => {
                    const seleccionada = form.prioridad === prio
                    let estiloActivo = 'bg-white text-slate-900 shadow-sm font-semibold'
                    if (seleccionada && prio === 'Urgente') estiloActivo = 'bg-red-500 text-white shadow-sm font-semibold'
                    if (seleccionada && prio === 'Alta') estiloActivo = 'bg-amber-500 text-white shadow-sm font-semibold'

                    return (
                      <button
                        key={prio}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDirectChange('prioridad', prio)}
                        className={`flex-1 rounded-lg py-2 text-center text-xs transition ${
                          seleccionada ? estiloActivo : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                        }`}
                      >
                        {prio}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.titulo}
                  onChange={handleChange('titulo')}
                  className={inputClass}
                  placeholder="Ej: Gotera en el techo del baño"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  maxLength={500}
                  rows={4}
                  value={form.descripcion}
                  onChange={handleChange('descripcion')}
                  className={`${inputClass} resize-none`}
                  placeholder="Describí el problema con el mayor detalle posible..."
                  disabled={submitting}
                />
              </div>

              {submitError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={cerrarForm}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : reclamoEditando ? 'Guardar cambios' : 'Enviar reclamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmModal
        open={confirmOpen}
        title="Eliminar reclamo"
        message={`¿Eliminar el reclamo "${reclamoAEliminar?.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        loading={eliminando}
      />
    </div>
  )
}
