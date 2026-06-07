import { useEffect, useMemo, useState } from 'react'
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
import { periodicidadLabelPorMeses, TIPO_AJUSTE_LABELS, TIPO_AJUSTE_OPCIONES } from '../../utils/contratoAumentosPreview'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

const FILTRO_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
]

const FILTRO_TIPO_AJUSTE = [
  { value: 'todos', label: 'Todos los ajustes' },
  ...TIPO_AJUSTE_OPCIONES.map(({ value, label }) => ({ value, label })),
]

const toolbarFieldClass =
  'box-border inline-flex h-[38px] w-auto max-w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50'

function normalizarBusqueda(texto) {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

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
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroTipoAjuste, setFiltroTipoAjuste] = useState('todos')
  const [busquedaInquilino, setBusquedaInquilino] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAnularOpen, setConfirmAnularOpen] = useState(false)
  const [contratoFinalizando, setContratoFinalizando] = useState(null)
  const [contratoAnulando, setContratoAnulando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const {
    contratos,
    loading,
    error,
    crear,
    finalizar,
    anular,
    submitting,
    submitError,
    limpiarSubmitError,
    finalizando,
    anulando,
    actionError,
    limpiarActionError,
    mensajeMovimientos,
    mensajeSoloInactivo,
  } = useContratos()
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { propiedades, loading: propiedadesLoading, refetch: refetchPropiedades } = usePropiedades()

  const conteosEstado = useMemo(
    () => ({
      activos: contratos.filter((c) => c.activo).length,
      inactivos: contratos.filter((c) => !c.activo).length,
      todos: contratos.length,
    }),
    [contratos]
  )

  const contratosFiltrados = useMemo(() => {
    let items = contratos

    if (filtroEstado === 'activos') items = items.filter((c) => c.activo)
    else if (filtroEstado === 'inactivos') items = items.filter((c) => !c.activo)

    if (filtroTipoAjuste !== 'todos') {
      items = items.filter((c) => c.tipo_ajuste === filtroTipoAjuste)
    }

    const termino = normalizarBusqueda(busquedaInquilino.trim())
    if (termino) {
      items = items.filter((c) =>
        normalizarBusqueda(c.inquilinos?.nombre_completo).includes(termino)
      )
    }

    return items
  }, [contratos, filtroEstado, filtroTipoAjuste, busquedaInquilino])

  const hayFiltrosExtra =
    filtroTipoAjuste !== 'todos' || busquedaInquilino.trim().length > 0

  const mensajeListadoVacio = useMemo(() => {
    if (loading) return 'Cargando contratos...'
    if (contratos.length === 0) return 'No hay contratos cargados'
    if (contratosFiltrados.length === 0 && hayFiltrosExtra) {
      return 'No hay contratos que coincidan con la búsqueda o los filtros aplicados'
    }
    if (filtroEstado === 'activos') return 'No hay contratos activos'
    if (filtroEstado === 'inactivos') return 'No hay contratos inactivos'
    return 'No hay contratos para mostrar'
  }, [loading, contratos.length, contratosFiltrados.length, filtroEstado, hayFiltrosExtra])

  useEffect(() => {
    if (!actionError) return
    const esErrorAnular =
      actionError === mensajeMovimientos || actionError === mensajeSoloInactivo
    setAlerta({
      open: true,
      titulo: esErrorAnular ? 'No se puede anular' : 'No se pudo finalizar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError, mensajeMovimientos, mensajeSoloInactivo])

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
      await refetchPropiedades()
      setConfirmOpen(false)
      setContratoFinalizando(null)
    }
  }

  const abrirConfirmAnular = (contrato) => {
    limpiarActionError()
    setContratoAnulando(contrato)
    setConfirmAnularOpen(true)
  }

  const cancelarAnular = () => {
    if (!anulando) {
      setConfirmAnularOpen(false)
      setContratoAnulando(null)
    }
  }

  const confirmarAnular = async () => {
    if (!contratoAnulando) return

    const ok = await anular(contratoAnulando)
    if (ok) {
      await refetchPropiedades()
      setConfirmAnularOpen(false)
      setContratoAnulando(null)
    }
  }

  const handleCrear = async (form) => {
    const ok = await crear(form)
    if (ok) await refetchPropiedades()
    return ok
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const mensajeConfirmacionFinalizar = contratoFinalizando
    ? `¿Finalizar el contrato de ${contratoFinalizando.inquilinos?.nombre_completo ?? 'este inquilino'} en ${contratoFinalizando.propiedades?.direccion ?? 'esta propiedad'}? Quedará inactivo pero se conservará en el historial.`
    : ''

  const mensajeConfirmacionAnular = contratoAnulando
    ? `¿Anular el contrato inactivo de ${contratoAnulando.inquilinos?.nombre_completo ?? 'este inquilino'} en ${contratoAnulando.propiedades?.direccion ?? 'esta propiedad'}? Solo está permitido si no tiene aumentos confirmados ni reclamos para ese inquilino y propiedad. Los documentos adjuntos se eliminarán junto con el contrato. Esta acción no se puede deshacer.`
    : ''

  return (
    <>
      <AdminListLayout
        title="Contratos de alquiler"
        subtitle="Por defecto se muestran los contratos activos"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Listado de Contratos</h2>

          <div className="flex flex-wrap items-center gap-2">
            <input
              id="busqueda-inquilino"
              type="search"
              value={busquedaInquilino}
              onChange={(e) => setBusquedaInquilino(e.target.value)}
              placeholder="Buscar inquilino..."
              aria-label="Buscar inquilino por nombre"
              className={`${toolbarFieldClass} min-w-[11rem] max-w-[14rem]`}
              disabled={loading}
            />

            <select
              id="filtro-tipo-ajuste"
              value={filtroTipoAjuste}
              onChange={(e) => setFiltroTipoAjuste(e.target.value)}
              aria-label="Filtrar por tipo de ajuste"
              className={`${toolbarFieldClass} max-w-[11rem] pr-8`}
              disabled={loading}
            >
              {FILTRO_TIPO_AJUSTE.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div
              className="inline-flex h-[38px] items-center rounded-lg border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Filtrar contratos por estado"
            >
              {FILTRO_ESTADO.map(({ value, label }) => {
                const activo = filtroEstado === value
                const count = loading ? '…' : conteosEstado[value]
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() => setFiltroEstado(value)}
                    className={`inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors ${
                      activo
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    } disabled:opacity-50`}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>

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

            {!loading && !error && contratosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>{mensajeListadoVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              contratosFiltrados.map((c) => (
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
                    ) : (
                      <TableRowActions
                        onDelete={() => abrirConfirmAnular(c)}
                        deleteLabel="Anular"
                        deleteVariant="danger"
                      />
                    )}
                  </AdminTableActionsCell>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>
      </AdminListLayout>

      <ContratoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleCrear}
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
        message={mensajeConfirmacionFinalizar}
        confirmLabel="Finalizar"
        confirmVariant="primary"
        onConfirm={confirmarFinalizar}
        onCancel={cancelarFinalizar}
        loading={finalizando}
      />

      <AdminConfirmModal
        open={confirmAnularOpen}
        title="Anular contrato"
        message={mensajeConfirmacionAnular}
        confirmLabel="Anular"
        onConfirm={confirmarAnular}
        onCancel={cancelarAnular}
        loading={anulando}
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
