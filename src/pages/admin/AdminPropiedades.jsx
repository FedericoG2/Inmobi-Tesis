import { useEffect, useState } from 'react'
import { Badge, Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
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
import PropiedadFormModal from '../../components/admin/forms/PropiedadFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { usePropiedades } from '../../hooks/usePropiedades'
import { usePropietarios } from '../../hooks/usePropietarios'
import { etiquetaPropietario } from '../../utils/etiquetaPropietario'

const estadoColor = {
  Disponible: 'emerald',
  Alquilada: 'blue',
  Mantenimiento: 'amber',
}

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

export default function AdminPropiedades() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propiedadEditando, setPropiedadEditando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [propiedadAEliminar, setPropiedadAEliminar] = useState(null)
  const [confirmReclamos, setConfirmReclamos] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const {
    propiedades,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarDependenciasPropiedad,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosActivos,
  } = usePropiedades()
  const { propietarios, loading: propietariosLoading } = usePropietarios()

  useEffect(() => {
    if (!actionError) return
    setAlerta({
      open: true,
      titulo: 'No se puede eliminar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError])

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setPropiedadEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    setPropiedadEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (propiedad) => {
    limpiarSubmitError()
    setPropiedadEditando(propiedad)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (propiedadEditando) {
      return actualizar(propiedadEditando.id, form)
    }
    return crear(form)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const mostrarAlerta = (titulo, mensaje) => {
    setAlerta({ open: true, titulo, mensaje })
  }

  const handleEliminar = async (propiedad) => {
    limpiarActionError()

    const dependencias = await contarDependenciasPropiedad(propiedad.id)

    if (dependencias.error) {
      mostrarAlerta('Error', dependencias.error.message)
      return
    }

    if (dependencias.contratos > 0) {
      mostrarAlerta('No se puede eliminar', mensajeContratosActivos)
      return
    }

    setPropiedadAEliminar(propiedad)
    setConfirmReclamos(dependencias.reclamos > 0)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setPropiedadAEliminar(null)
    setConfirmReclamos(false)
  }

  const confirmarEliminar = async () => {
    if (!propiedadAEliminar) return

    setEliminando(true)
    const ok = await eliminar(propiedadAEliminar.id)
    setEliminando(false)

    if (ok) {
      cancelarEliminar()
    }
  }

  const mensajeConfirmacion = confirmReclamos
    ? '¡Atención! Si eliminás esta propiedad, también se borrarán todos sus reclamos asociados. ¿Querés continuar?'
    : `¿Eliminar la propiedad "${propiedadAEliminar?.direccion}"? Esta acción no se puede deshacer.`

  return (
    <>
      <AdminListLayout
        title="Propiedades"
        actionLabel="Nueva propiedad"
        onAction={abrirModalCrear}
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar propiedades: {error}</p>
            </Card>
          ) : null
        }
      >
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Propietario</AdminTableHeaderCell>
              <AdminTableHeaderCell>Dirección</AdminTableHeaderCell>
              <AdminTableHeaderCell>Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando propiedades...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propiedades.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>No hay propiedades cargadas</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              propiedades.map((p) => (
                <AdminTableRow key={p.id}>
                  <AdminTableCell
                    className={!p.propietario_id ? 'italic text-slate-500' : undefined}
                  >
                    {etiquetaPropietario(p)}
                  </AdminTableCell>
                  <AdminTableCell className="font-medium text-slate-900">{p.direccion}</AdminTableCell>
                  <AdminTableCell>{p.tipo}</AdminTableCell>
                  <AdminTableCell>
                    <Badge color={estadoColor[p.estado] ?? 'slate'}>{p.estado}</Badge>
                  </AdminTableCell>
                  <AdminTableActionsCell>
                    <TableRowActions
                      onEdit={() => abrirModalEditar(p)}
                      onDelete={() => handleEliminar(p)}
                    />
                  </AdminTableActionsCell>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>
      </AdminListLayout>

      <PropiedadFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        propiedad={propiedadEditando}
        propietarios={propietarios}
        propietariosLoading={propietariosLoading}
      />

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />

      <AdminConfirmModal
        open={confirmOpen}
        title={confirmReclamos ? 'Eliminar propiedad y reclamos' : 'Eliminar propiedad'}
        message={mensajeConfirmacion}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        loading={eliminando}
      />
    </>
  )
}
