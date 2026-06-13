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
const dependenciasIniciales = { contratos_activos: 0, contratos_historicos: 0, reclamos: 0 }

function buildMensajeConfirmacionDelete(propiedad, deps) {
  const partes = []
  if (deps.contratos_historicos > 0) {
    const n = deps.contratos_historicos
    partes.push(`${n} contrato${n > 1 ? 's' : ''} histórico${n > 1 ? 's' : ''}`)
  }
  if (deps.reclamos > 0) {
    const n = deps.reclamos
    partes.push(`${n} reclamo${n > 1 ? 's' : ''}`)
  }

  if (partes.length > 0) {
    return `¡Atención! La propiedad "${propiedad.direccion}" tiene ${partes.join(' y ')} asociados. Si la eliminás, se borrará todo ese historial. ¿Querés continuar?`
  }

  return `¿Eliminar la propiedad "${propiedad.direccion}"? Esta acción no se puede deshacer.`
}

export default function AdminPropiedades() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propiedadEditando, setPropiedadEditando] = useState(null)
  const [tieneContratoActivo, setTieneContratoActivo] = useState(false)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [propiedadAEliminar, setPropiedadAEliminar] = useState(null)
  const [dependenciasEliminar, setDependenciasEliminar] = useState(dependenciasIniciales)
  const [eliminando, setEliminando] = useState(false)
  const [confirmCambioPropietario, setConfirmCambioPropietario] = useState(false)
  const [pendingForm, setPendingForm] = useState(null)

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
      setTieneContratoActivo(false)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    setPropiedadEditando(null)
    setTieneContratoActivo(false)
    setModalOpen(true)
  }

  const abrirModalEditar = async (propiedad) => {
    limpiarSubmitError()

    const deps = await contarDependenciasPropiedad(propiedad.id)

    setPropiedadEditando(propiedad)
    setTieneContratoActivo(!deps.error && deps.contratos_activos > 0)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (propiedadEditando) {
      const propietarioCambio =
        tieneContratoActivo &&
        String(form.propietario_id) !== String(propiedadEditando.propietario_id)

      if (propietarioCambio) {
        setPendingForm(form)
        setConfirmCambioPropietario(true)
        return false
      }

      return actualizar(propiedadEditando.id, form)
    }
    return crear(form)
  }

  const confirmarCambioPropietario = async () => {
    if (!pendingForm || !propiedadEditando) return
    const ok = await actualizar(propiedadEditando.id, pendingForm)
    setConfirmCambioPropietario(false)
    setPendingForm(null)
    if (ok) cerrarModal()
  }

  const cancelarCambioPropietario = () => {
    if (submitting) return
    setConfirmCambioPropietario(false)
    setPendingForm(null)
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

    if (dependencias.contratos_activos > 0) {
      mostrarAlerta('No se puede eliminar', mensajeContratosActivos)
      return
    }

    setPropiedadAEliminar(propiedad)
    setDependenciasEliminar(dependencias)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setPropiedadAEliminar(null)
    setDependenciasEliminar(dependenciasIniciales)
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

  const tieneHistorial =
    dependenciasEliminar.contratos_historicos > 0 || dependenciasEliminar.reclamos > 0

  const tituloConfirmDelete = tieneHistorial
    ? 'Eliminar propiedad con historial'
    : 'Eliminar propiedad'

  const mensajeConfirmacion = propiedadAEliminar
    ? buildMensajeConfirmacionDelete(propiedadAEliminar, dependenciasEliminar)
    : ''

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
        tieneContratoActivo={tieneContratoActivo}
      />

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />

      <AdminConfirmModal
        open={confirmOpen}
        title={tituloConfirmDelete}
        message={mensajeConfirmacion}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        loading={eliminando}
      />

      <AdminConfirmModal
        open={confirmCambioPropietario}
        title="Cambiar propietario con contrato activo"
        message="Esta propiedad tiene un contrato activo. Estás cambiando el propietario asignado. ¿Querés continuar de todas formas?"
        confirmLabel="Sí, cambiar propietario"
        confirmVariant="primary"
        onConfirm={confirmarCambioPropietario}
        onCancel={cancelarCambioPropietario}
        loading={submitting}
      />
    </>
  )
}
