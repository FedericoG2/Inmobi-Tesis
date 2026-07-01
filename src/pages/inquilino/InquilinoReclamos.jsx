import { useState } from 'react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  badgePrioridad,
  CATEGORIAS_RECLAMO,
  infoCategoria,
  infoEstado,
  PILL_RING_CLASS,
  PRIORIDADES_RECLAMO,
  RECLAMO_CHIP_CLASS,
} from '../../utils/reclamosUi'
import { RECLAMO_LIMITES } from '../../utils/validarReclamo'
import {
  portalBtnDanger,
  portalBtnGhost,
  portalBtnPrimary,
  portalBtnSecondary,
  portalCardClass,
  portalEmptyState,
  portalInputClass,
  portalLabelClass,
  portalPageShell,
  portalSectionTitle,
} from '../../utils/portalInquilinoUi'

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
        contrato_id: contratoActivo?.id ?? null,
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

  const nuevoReclamoBtn = (
    <button
      type="button"
      onClick={abrirFormCrear}
      disabled={!contratoActivo}
      className={`${portalBtnPrimary} inline-flex w-full sm:w-auto`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
      Nuevo reclamo
    </button>
  )

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Mis Reclamos"
        subtitle="Reportá y seguí el estado de tus solicitudes de mantenimiento"
        action={nuevoReclamoBtn}
      />

      {errorAccion && (
        <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{errorAccion}</p>
          <button type="button" onClick={() => setErrorAccion(null)} className={`${portalBtnGhost} !h-auto !px-2 text-red-600`}>
            Cerrar
          </button>
        </div>
      )}

      {reclamosLoading && (
        <p className="text-sm text-slate-500">Actualizando reclamos...</p>
      )}

      {reclamos.length === 0 && !reclamosLoading && (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">No tenés reclamos registrados</p>
          <p className="mt-1 text-xs text-slate-400">
            {contratoActivo
              ? 'Usá el botón Nuevo reclamo para reportar un problema'
              : 'Necesitás tener un contrato activo para registrar reclamos'}
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
        {reclamos.map((r) => {
          const esPendiente = r.estado === 'Pendiente'
          const catInfo = infoCategoria(r.categoria)
          const prioBadge = badgePrioridad(r.prioridad)
          const estadoInfo = infoEstado(r.estado)

          return (
            <li key={r.id} className={`${portalCardClass} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{r.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatFecha(r.fecha_creacion)}</p>
                </div>
                {estadoInfo && (
                  <span className={RECLAMO_CHIP_CLASS}>
                    <span className="text-sm leading-none">{estadoInfo.icon}</span>
                    <span>{estadoInfo.label}</span>
                  </span>
                )}
              </div>

              {(catInfo || prioBadge) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {catInfo && (
                    <span className={RECLAMO_CHIP_CLASS}>
                      <span className="text-sm leading-none">{catInfo.icon}</span>
                      <span>{catInfo.label}</span>
                    </span>
                  )}
                  {prioBadge && (
                    <span className={`${PILL_RING_CLASS} ${prioBadge.className}`}>{prioBadge.label}</span>
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
                  <button type="button" onClick={() => abrirFormEditar(r)} className={portalBtnSecondary}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleEliminar(r)} className={portalBtnDanger}>
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:items-center lg:px-6 lg:pb-4"
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
          <div className={`relative z-10 max-h-[min(85vh,40rem)] w-full max-w-lg overflow-y-auto ${portalCardClass} p-5 shadow-2xl lg:max-h-[90vh] lg:max-w-xl lg:p-6`}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 lg:hidden" aria-hidden="true" />

            <div className="relative mb-5 text-center">
              <h3 id="reclamo-form-title" className={portalSectionTitle}>
                {reclamoEditando ? 'Editar reclamo' : 'Nuevo reclamo'}
              </h3>
              <button
                type="button"
                onClick={cerrarForm}
                disabled={submitting}
                className={`${portalBtnGhost} absolute right-0 top-1/2 -translate-y-1/2`}
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!reclamoEditando && contratoActivo?.propiedades?.direccion && (
              <p className="mb-5 rounded-lg bg-brand-50 px-4 py-2.5 text-center text-xs font-medium leading-relaxed text-brand-700 ring-1 ring-inset ring-brand-100">
                {contratoActivo.propiedades.direccion}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
              <div>
                <label className={portalLabelClass}>
                  Tipo de problema <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {CATEGORIAS_RECLAMO.map((cat) => {
                    const seleccionada = form.categoria === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDirectChange('categoria', cat.id)}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition ${
                          seleccionada
                            ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 ring-2 ring-brand-100'
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
                <label className={portalLabelClass}>
                  Urgencia <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
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
                        className={`flex-1 rounded-md py-2 text-center text-xs transition ${
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
                <label className={portalLabelClass}>
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={RECLAMO_LIMITES.TITULO_MAX}
                  value={form.titulo}
                  onChange={handleChange('titulo')}
                  className={portalInputClass}
                  placeholder="Ej: Gotera en el techo del baño"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={portalLabelClass}>
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  maxLength={RECLAMO_LIMITES.DESCRIPCION_MAX}
                  rows={4}
                  value={form.descripcion}
                  onChange={handleChange('descripcion')}
                  className={`${portalInputClass} resize-none`}
                  placeholder="Describí el problema con el mayor detalle posible..."
                  disabled={submitting}
                />
              </div>

              {submitError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">
                  {submitError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={cerrarForm} disabled={submitting} className={portalBtnSecondary}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className={`${portalBtnPrimary} flex-1`}>
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
