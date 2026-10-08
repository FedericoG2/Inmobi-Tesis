import { useState } from 'react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { CATEGORIAS_RECLAMO, PRIORIDAD_SEGMENTO_ACTIVO, PRIORIDADES_RECLAMO } from '../../utils/reclamosUi'
import { RECLAMO_LIMITES } from '../../utils/validarReclamo'
import {
  portalBtnDanger,
  portalBtnSecondary,
  portalCardClass,
  portalEmptyState,
  portalInputClass,
  portalLabelClass,
  portalPageShell,
} from '../../utils/portalInquilinoUi'
import { ReclamoCategoriaChip, ReclamoEstadoChip, ReclamoPrioridadChip } from '../../components/admin/ReclamoChips'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { IconPencil, IconPlus, IconTrash, IconWrench, IconX } from '../../components/icons/Icons'
import {
  calloutClass,
  cn,
  iconTileClass,
  modalFormClass,
  optionCardClass,
  segmentedClass,
  textareaClass,
} from '../../utils/ui'

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
    <Button icon={IconPlus} onClick={abrirFormCrear} disabled={!contratoActivo} className="w-full sm:w-auto">
      Nuevo reclamo
    </Button>
  )

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Mis reclamos"
        subtitle="Reportá y seguí el estado de tus pedidos de mantenimiento."
        action={nuevoReclamoBtn}
      />

      {errorAccion && (
        <div className={cn(calloutClass('danger'), 'flex items-start justify-between gap-3')}>
          <p>{errorAccion}</p>
          <button
            type="button"
            onClick={() => setErrorAccion(null)}
            aria-label="Cerrar aviso"
            className="rounded-md p-0.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
          >
            <IconX className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {reclamosLoading && <p className="text-sm text-slate-500">Actualizando reclamos…</p>}

      {reclamos.length === 0 && !reclamosLoading && (
        <div className={portalEmptyState}>
          <span className={`${iconTileClass('neutral', 'lg', 'circle')} mx-auto mb-3`}>
            <IconWrench className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-slate-700">No tenés reclamos registrados</p>
          <p className="mt-1 text-sm text-slate-500">
            {contratoActivo
              ? 'Usá el botón Nuevo reclamo para reportar un problema.'
              : 'Necesitás tener un contrato activo para registrar reclamos.'}
          </p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reclamos.map((r) => {
          const esPendiente = r.estado === 'Pendiente'

          return (
            <li key={r.id} className={`${portalCardClass} flex flex-col p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{r.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatFecha(r.fecha_creacion)}</p>
                </div>
                <ReclamoEstadoChip estado={r.estado} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <ReclamoCategoriaChip categoria={r.categoria} />
                <ReclamoPrioridadChip prioridad={r.prioridad} />
              </div>

              {r.descripcion && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{r.descripcion}</p>}

              {r.propiedades?.direccion && (
                <p className="mt-2 truncate text-xs text-slate-500">{r.propiedades.direccion}</p>
              )}

              {esPendiente && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => abrirFormEditar(r)} className={portalBtnSecondary}>
                    <IconPencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button type="button" onClick={() => handleEliminar(r)} className={portalBtnDanger}>
                    <IconTrash className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Modal open={showForm} onClose={submitting ? undefined : cerrarForm} size="xl" labelledBy="reclamo-form-title">
        <ModalHeader
          titleId="reclamo-form-title"
          icon={reclamoEditando ? IconPencil : IconWrench}
          title={reclamoEditando ? 'Editar reclamo' : 'Nuevo reclamo'}
          subtitle={!reclamoEditando ? contratoActivo?.propiedades?.direccion : undefined}
          onClose={submitting ? undefined : cerrarForm}
        />

        <form onSubmit={handleSubmit} className={modalFormClass}>
          <ModalBody className="space-y-5">
            <div>
              <p className={portalLabelClass}>
                Tipo de problema <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIAS_RECLAMO.map((cat) => {
                  const seleccionada = form.categoria === cat.id
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDirectChange('categoria', cat.id)}
                      className={cn(optionCardClass(seleccionada), 'disabled:opacity-50')}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', seleccionada ? 'text-brand-600' : 'text-slate-400')} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className={portalLabelClass}>
                Urgencia <span className="text-red-500">*</span>
              </p>
              <div className={segmentedClass}>
                {PRIORIDADES_RECLAMO.map((prio) => {
                  const seleccionada = form.prioridad === prio
                  return (
                    <button
                      key={prio}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDirectChange('prioridad', prio)}
                      className={cn(
                        'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition disabled:opacity-50',
                        seleccionada ? PRIORIDAD_SEGMENTO_ACTIVO[prio] : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {prio}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="reclamo-titulo" className={portalLabelClass}>
                Título <span className="text-red-500">*</span>
              </label>
              <input
                id="reclamo-titulo"
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
              <label htmlFor="reclamo-descripcion" className={portalLabelClass}>
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reclamo-descripcion"
                required
                maxLength={RECLAMO_LIMITES.DESCRIPCION_MAX}
                rows={4}
                value={form.descripcion}
                onChange={handleChange('descripcion')}
                className={cn(textareaClass, 'resize-none')}
                placeholder="Describí el problema con el mayor detalle posible…"
                disabled={submitting}
              />
            </div>

            {submitError && <p className={calloutClass('danger')}>{submitError}</p>}
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={cerrarForm} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {reclamoEditando ? 'Guardar cambios' : 'Enviar reclamo'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

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
