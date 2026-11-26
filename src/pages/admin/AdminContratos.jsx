import { useMemo, useState } from 'react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import CerrarContratoModal from '../../components/admin/CerrarContratoModal'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import StatCard from '../../components/admin/StatCard'
import {
  AdminTable,
  AdminTableBody,
  AdminTableActionsCell,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import FilterSelect from '../../components/admin/FilterSelect'
import IndiceChip from '../../components/admin/IndiceChip'
import ContratoDetalleModal from '../../components/admin/ContratoDetalleModal'
import ContratoFormModal from '../../components/admin/forms/ContratoFormModal'
import ContratoRowActions from '../../components/admin/ContratoRowActions'
import InquilinoDetalleModal from '../../components/admin/InquilinoDetalleModal'
import PropiedadDetalleModal from '../../components/admin/PropiedadDetalleModal'
import { useContratos } from '../../hooks/useContratos'
import { usePaginacion } from '../../hooks/usePaginacion'
import { useFilasPorPagina } from '../../hooks/useFilasPorPagina'
import { useToast } from '../../contexts/ToastContext'
import { useInquilinos } from '../../hooks/useInquilinos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { TIPO_AJUSTE_OPCIONES } from '../../utils/contratoAumentosPreview'
import { badgeEstadoContratoUi, hoyIsoLocal } from '../../utils/contratoVigencia'
import { formatPeriodoMesAnio } from '../../utils/aumentosUi'
import { IconSearch } from '../../components/icons/Icons'
import { calloutClass, cn, inputClass, segmentedInlineClass, segmentedItemClass } from '../../utils/ui'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }


const COL_INQUILINO = 'w-[11rem]'
const COL_MONTO = 'w-[8.5rem]'
const COL_AJUSTE = 'w-[5.5rem]'
const COL_PROX_AUMENTO = 'w-[7.5rem]'
const COL_ESTADO = 'w-[7rem]'
const COL_ACCIONES = 'w-[7rem]'

const FILTRO_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'programados', label: 'Programados' },
  { value: 'inactivos', label: 'Finalizados' },
  { value: 'todos', label: 'Todos' },
]

const FILTRO_TIPO_AJUSTE = [
  { value: 'todos', label: 'Todos los ajustes' },
  ...TIPO_AJUSTE_OPCIONES.map(({ value }) => ({ value, label: value.toUpperCase() })),
]

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

export default function AdminContratos() {
  const [refTabla, filasPorPagina] = useFilasPorPagina()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroTipoAjuste, setFiltroTipoAjuste] = useState('todos')
  const [busquedaInquilino, setBusquedaInquilino] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAnularOpen, setConfirmAnularOpen] = useState(false)
  const [contratoFinalizando, setContratoFinalizando] = useState(null)
  const [contratoAnulando, setContratoAnulando] = useState(null)
  const [contratoDetalleId, setContratoDetalleId] = useState(null)
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)
  const [inquilinoDetalle, setInquilinoDetalle] = useState(null)
  const [propiedadDetalle, setPropiedadDetalle] = useState(null)
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
      activos: contratos.filter((c) => c.estado === 'activo').length,
      programados: contratos.filter((c) => c.estado === 'programado').length,
      inactivos: contratos.filter((c) => c.estado === 'inactivo').length,
      todos: contratos.length,
    }),
    [contratos]
  )

  const contratosFiltrados = useMemo(() => {
    let items = contratos

    if (filtroEstado === 'activos') {
      items = items.filter((c) => c.estado === 'activo')
    } else if (filtroEstado === 'programados') {
      items = items.filter((c) => c.estado === 'programado')
    } else if (filtroEstado === 'inactivos') {
      items = items.filter((c) => c.estado === 'inactivo')
    }

    if (filtroTipoAjuste !== 'todos') {
      items = items.filter((c) => c.tipo_ajuste === filtroTipoAjuste)
    }

    const termino = normalizarBusqueda(busquedaInquilino.trim())
    if (termino) {
      items = items.filter((c) => {
        const inquilino = normalizarBusqueda(c.inquilinos?.nombre_completo)
        const propiedad = normalizarBusqueda(c.propiedades?.direccion)
        return inquilino.includes(termino) || propiedad.includes(termino)
      })
    }

    return items
  }, [contratos, filtroEstado, filtroTipoAjuste, busquedaInquilino])

  const {
    pagina: paginaActual,
    totalPaginas,
    visibles: contratosPagina,
    irAPagina: setPaginaActual,
  } = usePaginacion(contratosFiltrados, filasPorPagina, [filtroEstado, filtroTipoAjuste, busquedaInquilino])

  const hayFiltrosExtra =
    filtroTipoAjuste !== 'todos' || busquedaInquilino.trim().length > 0

  const mensajeListadoVacio = useMemo(() => {
    if (loading) return 'Cargando contratos…'
    if (contratos.length === 0) return 'No hay contratos cargados'
    if (contratosFiltrados.length === 0 && hayFiltrosExtra) {
      return 'No hay contratos que coincidan con la búsqueda o los filtros aplicados'
    }
    if (filtroEstado === 'activos') return 'No hay contratos activos'
    if (filtroEstado === 'programados') return 'No hay contratos programados'
    if (filtroEstado === 'inactivos') return 'No hay contratos finalizados, rescindidos ni cancelados'
    return 'No hay contratos para mostrar'
  }, [loading, contratos.length, contratosFiltrados.length, filtroEstado, hayFiltrosExtra])

  // Un error de finalizar o eliminar se muestra en el aviso hasta que se cierra.
  const esErrorAnular = actionError === mensajeMovimientos || actionError === mensajeSoloInactivo
  const alertaVisible = actionError
    ? { open: true, titulo: esErrorAnular ? 'No se puede eliminar' : 'No se pudo finalizar', mensaje: actionError }
    : alerta

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

  const confirmarFinalizar = async (cierre) => {
    if (!contratoFinalizando) return

    const idFinalizado = contratoFinalizando.id
    const inquilinoNombre = contratoFinalizando.inquilinos?.nombre_completo ?? 'el inquilino'
    const direccion = contratoFinalizando.propiedades?.direccion ?? 'La propiedad'
    const ok = await finalizar(idFinalizado, cierre)
    if (ok) {
      const titulo = { Cancelado: 'Contrato cancelado', Rescindido: 'Contrato rescindido' }[cierre.motivo] ?? 'Contrato finalizado'
      toast.success(titulo, `${inquilinoNombre} · ${direccion} quedó Disponible y deja de incluirse en aumentos.`)
      await refetchPropiedades()
      setConfirmOpen(false)
      setContratoFinalizando(null)
      if (contratoDetalleId != null && String(contratoDetalleId) === String(idFinalizado)) {
        cerrarDetalle()
      }
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
    setConfirmAnularOpen(false)
    setContratoAnulando(null)
    if (ok) {
      toast.success(
        'Contrato eliminado',
        `Se eliminó el contrato de ${contratoAnulando.inquilinos?.nombre_completo ?? 'el inquilino'} y sus documentos.`
      )
      await refetchPropiedades()
    }
  }

  const handleCrear = async (form) => {
    const ok = await crear(form)
    if (ok) {
      const inquilino = inquilinos.find((i) => String(i.id) === String(form.inquilino_id))
      const propiedad = propiedades.find((p) => String(p.id) === String(form.propiedad_id))
      const programado = form.fecha_inicio > hoyIsoLocal()
      const partes = [inquilino?.nombre_completo, propiedad?.direccion].filter(Boolean).join(' · ')
      toast.success(
        programado ? 'Contrato creado y programado' : 'Contrato creado',
        programado
          ? `${partes}. Arranca el ${formatFecha(form.fecha_inicio)}; mientras tanto la propiedad queda Reservada.`
          : `${partes}. El contrato está activo y la propiedad pasó a Alquilada.`
      )
      await refetchPropiedades()
    }
    return ok
  }

  const abrirDetalle = (contrato) => {
    setContratoDetalleId(contrato.id)
  }

  const cerrarDetalle = () => {
    setContratoDetalleId(null)
  }

  const resolverInquilino = (inquilino) => {
    if (!inquilino?.id) return inquilino
    return inquilinos.find((i) => String(i.id) === String(inquilino.id)) ?? inquilino
  }

  const resolverPropiedad = (propiedad) => {
    if (!propiedad?.id) return propiedad
    return propiedades.find((p) => String(p.id) === String(propiedad.id)) ?? propiedad
  }

  const abrirDetalleInquilino = (inquilino) => {
    setInquilinoDetalle(resolverInquilino(inquilino))
    setDetalleInquilinoOpen(true)
  }

  const abrirDetallePropiedad = (propiedad) => {
    setPropiedadDetalle(resolverPropiedad(propiedad))
    setDetallePropiedadOpen(true)
  }

  const cerrarAlerta = () => {
    limpiarActionError()
    setAlerta(alertaInicial)
  }

  const mensajeConfirmacionAnular = contratoAnulando
    ? `¿Eliminar el contrato ${contratoAnulando.estado === 'programado' ? 'programado' : 'finalizado'} de ${contratoAnulando.inquilinos?.nombre_completo ?? 'este inquilino'} en ${contratoAnulando.propiedades?.direccion ?? 'esta propiedad'}? Solo está permitido si no tiene aumentos confirmados, períodos de alquiler, comprobantes de pago ni reclamos de ese inquilino sobre la propiedad. Los documentos adjuntos se eliminarán junto con el contrato. Esta acción no se puede deshacer.`
    : ''

  return (
    <>
      <AdminListLayout refTabla={refTabla}
        title="Contratos"
        subtitle="Cartera de alquileres: vigencia, ajustes y ciclo de vida de cada contrato."
        actions={<AdminNuevoButton label="Nuevo contrato" onClick={abrirModal} />}
        alerts={
          error ? (
            <div className={calloutClass('danger')}>Error al cargar contratos: {error}</div>
          ) : null
        }
        summary={
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              compact
              label="Activos"
              value={loading ? '…' : conteosEstado.activos}
              icon="clipboard"
              theme="slate"
              onClick={() => setFiltroEstado('activos')}
            />
            <StatCard
              compact
              label="Programados"
              value={loading ? '…' : conteosEstado.programados}
              icon="calendar"
              theme="slate"
              onClick={() => setFiltroEstado('programados')}
            />
            <StatCard
              compact
              label="Finalizados"
              value={loading ? '…' : conteosEstado.inactivos}
              icon="check"
              theme="slate"
              onClick={() => setFiltroEstado('inactivos')}
            />
          </div>
        }
      >
        <div className="space-y-3 border-b border-slate-200/80 px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="busqueda-inquilino"
                type="search"
                value={busquedaInquilino}
                onChange={(e) => setBusquedaInquilino(e.target.value)}
                placeholder="Buscar por inquilino o propiedad…"
                aria-label="Buscar por inquilino o dirección de propiedad"
                className={cn(inputClass, 'pl-9')}
                disabled={loading}
              />
            </div>

            <FilterSelect
              id="filtro-tipo-ajuste"
              value={filtroTipoAjuste}
              onChange={(e) => setFiltroTipoAjuste(e.target.value)}
              onClear={() => setFiltroTipoAjuste('todos')}
              ariaLabel="Filtrar por tipo de ajuste"
              className="w-full shrink-0 sm:w-44"
              clearValue="todos"
              disabled={loading}
            >
              <option value="todos">Ajuste: Todos</option>
              {FILTRO_TIPO_AJUSTE.filter(({ value }) => value !== 'todos').map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="overflow-x-auto overflow-y-hidden">
            <div
              className={segmentedInlineClass}
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
                    className={cn(
                      segmentedItemClass(activo, { fill: false }),
                      'inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50'
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[11px] tabular-nums',
                        activo
                            ? 'bg-slate-100 text-slate-700'
                            : 'text-slate-400'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <AdminTable className="w-full">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className={COL_INQUILINO}>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell className="min-w-0">Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_MONTO}>Monto</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_AJUSTE} !text-center`}>Ajuste</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_PROX_AUMENTO} whitespace-nowrap !text-center`}>
                Próx. aumento
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_ESTADO} !text-center`}>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_ACCIONES} !text-right`}>Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>Cargando contratos…</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && contratosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>{mensajeListadoVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              contratosPagina.map((c) => {
                return (
                <AdminTableRow key={c.id ?? `${c.inquilino_id}-${c.propiedad_id}`}>
                  <AdminTableCell className={`${COL_INQUILINO} font-medium text-slate-900`}>
                    <span className="line-clamp-2" title={c.inquilinos?.nombre_completo ?? undefined}>
                      {c.inquilinos?.nombre_completo ?? '—'}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="min-w-0">
                    <span className="line-clamp-2" title={c.propiedades?.direccion ?? undefined}>
                      {c.propiedades?.direccion ?? '—'}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_MONTO} tabular-nums text-slate-900`}>{formatMonto(c.monto_alquiler)}</AdminTableCell>
                  <AdminTableCell className={`${COL_AJUSTE} !text-center`}>
                    {c.tipo_ajuste ? (
                      <IndiceChip tipo={c.tipo_ajuste} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_PROX_AUMENTO} whitespace-nowrap !text-center text-slate-600 tabular-nums`}>
                    {c.estado === 'inactivo' ? '—' : formatPeriodoMesAnio(c.fecha_proximo_aumento)}
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_ESTADO} !text-center`}>
                    {(() => {
                      const estado = badgeEstadoContratoUi(c)
                      return <span className={estado.className}>{estado.label}</span>
                    })()}
                  </AdminTableCell>
                  <AdminTableActionsCell className={COL_ACCIONES}>
                    <ContratoRowActions
                      onView={() => abrirDetalle(c)}
                      onFinalize={
                        c.estado === 'programado' || c.estado === 'activo'
                          ? () => abrirConfirmFinalizar(c)
                          : undefined
                      }
                      finalizeLabel={c.estado === 'programado' ? 'Cancelar' : 'Finalizar'}
                      onAnular={
                        c.estado === 'inactivo' || c.estado === 'programado'
                          ? () => abrirConfirmAnular(c)
                          : undefined
                      }
                    />
                  </AdminTableActionsCell>
                </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>

        <AdminTablePagination
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          totalItems={contratosFiltrados.length}
          itemsPorPagina={filasPorPagina}
          onPaginaChange={setPaginaActual}
        />
      </AdminListLayout>

      <ContratoFormModal
        key={modalOpen ? 'formulario-abierto' : 'formulario-cerrado'}
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

      <ContratoDetalleModal
        open={contratoDetalleId != null}
        contratoId={contratoDetalleId}
        onClose={cerrarDetalle}
        onVerInquilino={abrirDetalleInquilino}
        onVerPropiedad={abrirDetallePropiedad}
        onFinalizar={abrirConfirmFinalizar}
      />

      <InquilinoDetalleModal
        open={detalleInquilinoOpen}
        inquilino={inquilinoDetalle}
        onClose={() => {
          setDetalleInquilinoOpen(false)
          setInquilinoDetalle(null)
        }}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadDetalle}
        onClose={() => {
          setDetallePropiedadOpen(false)
          setPropiedadDetalle(null)
        }}
        apilado
      />

      {confirmOpen && contratoFinalizando && (
        <CerrarContratoModal
          key={contratoFinalizando.id}
          contrato={contratoFinalizando}
          apilado={contratoDetalleId != null}
          onConfirmar={confirmarFinalizar}
          onCancelar={cancelarFinalizar}
          loading={finalizando}
        />
      )}

      <AdminConfirmModal
        open={confirmAnularOpen}
        title="Eliminar contrato"
        message={mensajeConfirmacionAnular}
        confirmLabel="Eliminar"
        onConfirm={confirmarAnular}
        onCancel={cancelarAnular}
        loading={anulando}
      />

      <AdminAlertModal
        open={alertaVisible.open}
        title={alertaVisible.titulo}
        message={alertaVisible.mensaje}
        onClose={cerrarAlerta}
      />
    </>
  )
}
