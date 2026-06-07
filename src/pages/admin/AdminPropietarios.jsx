import { useEffect, useState } from 'react'
import { Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
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

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

export default function AdminPropietarios() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propietarioEditando, setPropietarioEditando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const {
    propietarios,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarPropiedadesPorPropietario,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajePropiedadesAsociadas,
  } = usePropietarios()

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

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const handleEliminar = async (propietario) => {
    limpiarActionError()

    const dependencias = await contarPropiedadesPorPropietario(propietario.id)

    if (dependencias.error) {
      setAlerta({
        open: true,
        titulo: 'Error',
        mensaje: dependencias.error.message,
      })
      return
    }

    if (dependencias.propiedades > 0) {
      setAlerta({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: mensajePropiedadesAsociadas,
      })
      return
    }

    const confirmar = window.confirm(
      `¿Eliminar el propietario "${propietario.nombre_completo}"?`
    )
    if (!confirmar) return

    await eliminar(propietario.id)
  }

  return (
    <>
      <AdminListLayout
        title="Propietarios"
        actionLabel="Nuevo propietario"
        onAction={abrirModalCrear}
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar propietarios: {error}</p>
            </Card>
          ) : null
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

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />
    </>
  )
}
