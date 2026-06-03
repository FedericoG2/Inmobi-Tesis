import { useState } from 'react'
import { Card } from '@tremor/react'
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
import PropietarioFormModal from '../../components/admin/forms/PropietarioFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { usePropietarios } from '../../hooks/usePropietarios'

export default function AdminPropietarios() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propietarioEditando, setPropietarioEditando] = useState(null)
  const {
    propietarios,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
  } = usePropietarios()

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setPropietarioEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    limpiarActionError()
    setPropietarioEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (propietario) => {
    limpiarSubmitError()
    limpiarActionError()
    setPropietarioEditando(propietario)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (propietarioEditando) {
      return actualizar(propietarioEditando.id, form)
    }
    return crear(form)
  }

  const handleEliminar = async (propietario) => {
    const confirmar = window.confirm(
      `¿Eliminar el propietario "${propietario.nombre_completo}"? Sus propiedades seguirán cargadas y quedarán sin propietario asignado.`
    )
    if (!confirmar) return

    limpiarActionError()
    await eliminar(propietario.id)
  }

  return (
    <>
      <AdminListLayout
        title="Propietarios"
        actionLabel="Nuevo propietario"
        onAction={abrirModalCrear}
        alerts={
          <>
            {error && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">Error al cargar propietarios: {error}</p>
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
              <AdminTableHeaderCell>Nombre</AdminTableHeaderCell>
              <AdminTableHeaderCell>DNI/CUIT</AdminTableHeaderCell>
              <AdminTableHeaderCell>Teléfono</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando propietarios...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propietarios.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>No hay propietarios cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              propietarios.map((p) => (
                <AdminTableRow key={p.id ?? p.dni_cuit}>
                  <AdminTableCell className="font-medium text-slate-900">
                    {p.nombre_completo}
                  </AdminTableCell>
                  <AdminTableCell>{p.dni_cuit}</AdminTableCell>
                  <AdminTableCell>{p.telefono}</AdminTableCell>
                  <AdminTableCell>{p.email}</AdminTableCell>
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

      <PropietarioFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        propietario={propietarioEditando}
      />
    </>
  )
}
