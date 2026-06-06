import { useState } from 'react'
import { Badge, Card } from '@tremor/react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import {
  AdminTable,
  AdminTableBody,
  AdminTableActionsCell,
  AdminTableActionsHeaderCell,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import ReclamoFormModal from '../../components/admin/forms/ReclamoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useContratos } from '../../hooks/useContratos'
import { useReclamos } from '../../hooks/useReclamos'

const estadoColor = {
  Pendiente: 'amber',
  'En Proceso': 'blue',
  Resuelto: 'emerald',
}

export default function AdminReclamos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [reclamoEditando, setReclamoEditando] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reclamoAEliminar, setReclamoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const {
    reclamos,
    loading,
    error,
    crear,
    actualizar,
    submitting,
    submitError,
    limpiarSubmitError,
    eliminar,
    actionError,
    limpiarActionError,
  } = useReclamos()
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { contratos, loading: contratosLoading } = useContratos()

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setReclamoEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    limpiarActionError()
    setReclamoEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (reclamo) => {
    limpiarSubmitError()
    limpiarActionError()
    setReclamoEditando(reclamo)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (reclamoEditando) {
      return actualizar(reclamoEditando.id, form)
    }
    return crear(form)
  }

  const handleEliminar = (reclamo) => {
    limpiarActionError()
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
    const ok = await eliminar(reclamoAEliminar.id)
    setEliminando(false)

    if (ok) {
      cancelarEliminar()
    }
  }

  const prioridadColor = {
    Urgente: 'red',
    Alta: 'rose',
    Media: 'orange',
    Baja: 'sky',
  }


  const esResuelto = reclamoAEliminar?.estado === 'Resuelto'
  const mensajeConfirmacion = esResuelto
    ? `Este reclamo ya está marcado como Resuelto. Si lo eliminás, se pierde el registro de esa gestión. ¿Eliminar "${reclamoAEliminar?.titulo}" igualmente?`
    : `¿Eliminar el reclamo "${reclamoAEliminar?.titulo}"? Esta acción no se puede deshacer.`

  return (
    <>
      <AdminListLayout
        title="Reclamos"
        subtitle="Tickets de mantenimiento por inquilino y propiedad (contrato activo al crear)"
        actionLabel="Nuevo reclamo"
        onAction={abrirModalCrear}
        alerts={
          <>
            {error && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">Error al cargar reclamos: {error}</p>
              </Card>
            )}
            {actionError && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">{actionError}</p>
              </Card>
            )}
          </>
        }
      >
       <AdminTable>
  <AdminTableHead>
    <AdminTableRow>
      <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
      <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
      <AdminTableHeaderCell>Categoria</AdminTableHeaderCell>
      <AdminTableHeaderCell>Descripción</AdminTableHeaderCell>
      {/* NUEVOS ENCABEZADOS */}
      <AdminTableHeaderCell>Fecha de Creación</AdminTableHeaderCell>
      <AdminTableHeaderCell>Prioridad</AdminTableHeaderCell>
      
      <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
      <AdminTableActionsHeaderCell />
    </AdminTableRow>
  </AdminTableHead>
  
  <AdminTableBody>
    {loading && (
      <AdminTableRow>
        {/* SE CAMBIA colSpan DE 5 A 7 */}
        <AdminTableEmptyCell colSpan={8}>Cargando reclamos...</AdminTableEmptyCell>
      </AdminTableRow>
    )}

    {!loading && !error && reclamos.length === 0 && (
      <AdminTableRow>
        {/* SE CAMBIA colSpan DE 5 A 7 */}
        <AdminTableEmptyCell colSpan={8}>No hay reclamos cargados</AdminTableEmptyCell>
      </AdminTableRow>
    )}

    {!loading &&
      reclamos.map((r) => (
        <AdminTableRow key={r.id}>
          <AdminTableCell>{r.inquilinos?.nombre_completo ?? '—'}</AdminTableCell>
          <AdminTableCell className="max-w-xs">{r.propiedades?.direccion ?? '—'}</AdminTableCell>
          <AdminTableCell>
  {r.categoria ? (
    <Badge color="slate" variant="secondary">
      {r.categoria}
    </Badge>
  ) : (
    <span className="text-slate-400 italic">Sin categoría</span>
  )}
</AdminTableCell>
          <AdminTableCell className="max-w-sm">
            <p className="font-medium text-slate-900">{r.titulo}</p>
            {r.descripcion && (
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{r.descripcion}</p>
            )}
          </AdminTableCell>

          {/* NUEVA CELDA: Fecha de Creación */}
          <AdminTableCell>
            {r.fecha_creacion
              ? new Date(r.fecha_creacion).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : '—'}
          </AdminTableCell>

          {/* NUEVA CELDA: Prioridad (con Badge de Tremor) */}
          <AdminTableCell>
            <Badge color={prioridadColor[r.prioridad] ?? 'slate'}>
              {r.prioridad ?? 'No asignada'}
            </Badge>
          </AdminTableCell>

          <AdminTableCell>
            <Badge color={estadoColor[r.estado] ?? 'slate'}>{r.estado}</Badge>
          </AdminTableCell>
          
          <AdminTableActionsCell>
            <TableRowActions
              onEdit={() => abrirModalEditar(r)}
              onDelete={() => handleEliminar(r)}
            />
          </AdminTableActionsCell>
        </AdminTableRow>
      ))}
  </AdminTableBody>
</AdminTable>
      </AdminListLayout>

      <ReclamoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        reclamo={reclamoEditando}
        inquilinos={inquilinos}
        inquilinosLoading={inquilinosLoading}
        contratos={contratos}
        contratosLoading={contratosLoading}
      />

      <AdminConfirmModal
        open={confirmOpen}
        title={esResuelto ? 'Eliminar reclamo resuelto' : 'Eliminar reclamo'}
        message={mensajeConfirmacion}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        loading={eliminando}
      />
    </>
  )
}
