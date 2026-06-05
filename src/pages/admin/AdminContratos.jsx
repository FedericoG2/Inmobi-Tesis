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
import ContratoFormModal from '../../components/admin/forms/ContratoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useContratos } from '../../hooks/useContratos'
import { useInquilinos } from '../../hooks/useInquilinos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { periodicidadLabelPorMeses, TIPO_AJUSTE_LABELS } from '../../utils/contratoAumentosPreview'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const formatVigencia = (inicio, fin) => {
  if (!inicio && !fin) return '—'
  return `${formatFecha(inicio)} - ${formatFecha(fin)}`
}

export default function AdminContratos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [contratoFinalizando, setContratoFinalizando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const {
    contratos,
    loading,
    error,
    crear,
    finalizar,
    submitting,
    submitError,
    limpiarSubmitError,
    finalizando,
    actionError,
    limpiarActionError,
  } = useContratos()
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { propiedades, loading: propiedadesLoading } = usePropiedades()

  useEffect(() => {
    if (!actionError) return
    setAlerta({
      open: true,
      titulo: 'No se pudo finalizar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError])

  const abrirModal = () => {
    limpiarSubmitError()
    setModalOpen(true)
  }

  const cerrarModal = () => {
    if (!submitting) setModalOpen(false)
  }

  const abrirConfirmFinalizar = (contrato) => {
    limpiarActionError()
    setContratoFinalizando(contrato)
    setConfirmOpen(true)
  }

  const cancelarFinalizar = () => {
    if (!finalizando) {
      setConfirmOpen(false)
      setContratoFinalizando(null)
    }
  }

  const confirmarFinalizar = async () => {
    if (!contratoFinalizando) return

    const ok = await finalizar(contratoFinalizando.id)
    if (ok) {
      setConfirmOpen(false)
      setContratoFinalizando(null)
    }
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const mensajeConfirmacion = contratoFinalizando
    ? `¿Finalizar el contrato de ${contratoFinalizando.inquilinos?.nombre_completo ?? 'este inquilino'} en ${contratoFinalizando.propiedades?.direccion ?? 'esta propiedad'}? Quedará inactivo pero se conservará en el historial.`
    : ''

  return (
    <>
      <AdminListLayout
        title="Contratos de alquiler"
        actionLabel="Nuevo contrato"
        onAction={abrirModal}
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar contratos: {error}</p>
            </Card>
          ) : null
        }
      >
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Monto</AdminTableHeaderCell>
              <AdminTableHeaderCell>Vigencia</AdminTableHeaderCell>
              <AdminTableHeaderCell>Ajuste</AdminTableHeaderCell>
              <AdminTableHeaderCell>Próx. aumento</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>Cargando contratos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && contratos.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>No hay contratos cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              contratos.map((c) => (
                <AdminTableRow key={c.id ?? `${c.inquilino_id}-${c.propiedad_id}`}>
                  <AdminTableCell className="font-medium text-slate-900">
                    {c.inquilinos?.nombre_completo ?? '—'}
                  </AdminTableCell>
                  <AdminTableCell>{c.propiedades?.direccion ?? '—'}</AdminTableCell>
                  <AdminTableCell className="tabular-nums">{formatMonto(c.monto_alquiler)}</AdminTableCell>
                  <AdminTableCell className="text-slate-600">
                    {formatVigencia(c.fecha_inicio, c.fecha_fin)}
                  </AdminTableCell>
                  <AdminTableCell className="text-slate-600 text-xs">
                    <span className="block">{TIPO_AJUSTE_LABELS[c.tipo_ajuste] ?? c.tipo_ajuste ?? '—'}</span>
                    <span className="text-slate-400">
                      {periodicidadLabelPorMeses(c.periodicidad_meses)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-slate-600 tabular-nums">
                    {formatFecha(c.fecha_proximo_aumento)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge color={c.activo ? 'emerald' : 'gray'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableActionsCell>
                    {c.activo ? (
                      <TableRowActions
                        onDelete={() => abrirConfirmFinalizar(c)}
                        deleteLabel="Finalizar"
                        deleteVariant="finalize"
                      />
                    ) : null}
                  </AdminTableActionsCell>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>
      </AdminListLayout>

      <ContratoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={crear}
        submitting={submitting}
        submitError={submitError}
        inquilinos={inquilinos}
        inquilinosLoading={inquilinosLoading}
        propiedades={propiedades}
        propiedadesLoading={propiedadesLoading}
        contratos={contratos}
      />

      <AdminConfirmModal
        open={confirmOpen}
        title="Finalizar contrato"
        message={mensajeConfirmacion}
        confirmLabel="Finalizar"
        confirmVariant="primary"
        onConfirm={confirmarFinalizar}
        onCancel={cancelarFinalizar}
        loading={finalizando}
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
