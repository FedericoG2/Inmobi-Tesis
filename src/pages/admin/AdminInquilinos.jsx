import { useEffect, useState } from 'react'
import { Badge, Card } from '@tremor/react'
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
import InquilinoFormModal from '../../components/admin/forms/InquilinoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

export default function AdminInquilinos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inquilinoEditando, setInquilinoEditando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const {
    inquilinos,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarContratosPorInquilino,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosAsociados,
  } = useInquilinos()

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
      setInquilinoEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    setInquilinoEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (inquilino) => {
    limpiarSubmitError()
    setInquilinoEditando(inquilino)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (inquilinoEditando) {
      return actualizar(inquilinoEditando.id, form)
    }
    return crear(form)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const handleEliminar = async (inquilino) => {
    limpiarActionError()

    const dependencias = await contarContratosPorInquilino(inquilino.id)

    if (dependencias.error) {
      setAlerta({
        open: true,
        titulo: 'Error',
        mensaje: dependencias.error.message,
      })
      return
    }

    if (dependencias.contratos > 0) {
      setAlerta({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: mensajeContratosAsociados,
      })
      return
    }

    const confirmar = window.confirm('¿Estás seguro de que querés eliminar a este inquilino?')
    if (!confirmar) return

    await eliminar(inquilino.id)
  }

  return (
    <>
      <AdminListLayout
        title="Inquilinos"
        actionLabel="Nuevo inquilino"
        onAction={abrirModalCrear}
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar inquilinos: {error}</p>
            </Card>
          ) : null
        }
      >
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>DNI</AdminTableHeaderCell>
              <AdminTableHeaderCell>Nombre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Vinculación app</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={4}>Cargando inquilinos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && inquilinos.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={4}>No hay inquilinos cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              inquilinos.map((i) => {
                const vinculado = Boolean(i.perfil_id)

                return (
                  <AdminTableRow key={i.id ?? i.dni_cuit}>
                    <AdminTableCell className="text-slate-500">{i.dni_cuit}</AdminTableCell>
                    <AdminTableCell className="font-medium text-slate-900">
                      {i.nombre_completo}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge color={vinculado ? 'emerald' : 'gray'}>
                        {vinculado ? 'Vinculado' : 'Sin vincular'}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableActionsCell>
                      <TableRowActions
                        onEdit={() => abrirModalEditar(i)}
                        onDelete={() => handleEliminar(i)}
                      />
                    </AdminTableActionsCell>
                  </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>
      </AdminListLayout>

      <InquilinoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        inquilino={inquilinoEditando}
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
