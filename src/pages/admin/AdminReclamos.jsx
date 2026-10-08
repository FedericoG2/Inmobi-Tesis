import { useEffect, useMemo, useState } from 'react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import {
  AdminTable,
  AdminTableBody,
  AdminTableActionsCell,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminTableToolbar,
} from '../../components/admin/AdminDataTable'
import FilterSelect from '../../components/admin/FilterSelect'
import ReclamoFormModal from '../../components/admin/forms/ReclamoFormModal'
import ReclamoDetalleModal from '../../components/admin/ReclamoDetalleModal'
import ReclamoGestionModal from '../../components/admin/ReclamoGestionModal'
import {
  ReclamoCategoriaChip,
  ReclamoEstadoChip,
  ReclamoPrioridadChip,
} from '../../components/admin/ReclamoChips'
import ReclamoRowActions from '../../components/admin/ReclamoRowActions'
import StatCard from '../../components/admin/StatCard'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useContratos } from '../../hooks/useContratos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { useReclamos } from '../../hooks/useReclamos'
import { celdaNombre, celdaNumero } from '../../utils/adminModuleUi'
import { IconSearch } from '../../components/icons/Icons'
import { calloutClass, cn, inputClass } from '../../utils/ui'

const estados = ['Pendiente', 'En Proceso', 'Revision', 'Resuelto']
const prioridades = ['Baja', 'Media', 'Alta', 'Urgente']

const COL_FECHA = 'w-[7.5rem]'
const COL_PRIORIDAD = 'w-[6.75rem]'
const COL_ESTADO = 'w-[8.75rem]'

const FILAS_POR_PAGINA = 4

// Opciones consistentes con el formulario
const CATEGORIAS = [
  { id: 'Plomeria', label: 'Plomería' },
  { id: 'Electricidad', label: 'Electricidad' },
  { id: 'Albañilería', label: 'Albañilería' },
  { id: 'Cerrajeria', label: 'Cerrajería' },
  { id: 'Pintura', label: 'Pintura' },
  { id: 'Estructural', label: 'Estructural' },
  { id: 'Gas', label: 'Gas' },
]

export default function AdminReclamos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [reclamoEditando, setReclamoEditando] = useState(null)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [reclamoDetalle, setReclamoDetalle] = useState(null)
  const [gestionOpen, setGestionOpen] = useState(false)
  const [reclamoGestion, setReclamoGestion] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reclamoAEliminar, setReclamoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
 
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)

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
    gestionar,
    actionError,
    limpiarActionError,
  } = useReclamos()
 
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { contratos, loading: contratosLoading } = useContratos()
  const { propiedades } = usePropiedades()

  const kpis = useMemo(() => {
    const lista = reclamos || []
    const noResuelto = (r) => r.estado !== 'Resuelto'
    return {
      pendientes: lista.filter((r) => r.estado === 'Pendiente').length,
      enAtencion: lista.filter((r) => r.estado === 'En Proceso' || r.estado === 'Revision').length,
      urgentes: lista.filter((r) => r.prioridad === 'Urgente' && noResuelto(r)).length,
      resueltos: lista.filter((r) => r.estado === 'Resuelto').length,
    }
  }, [reclamos])

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

  const abrirDetalle = (reclamo) => {
    setReclamoDetalle(reclamo)
    setDetalleOpen(true)
  }

  const cerrarDetalle = () => {
    setDetalleOpen(false)
    setReclamoDetalle(null)
  }

  const abrirGestion = (reclamo) => {
    limpiarActionError()
    setReclamoGestion(reclamo)
    setGestionOpen(true)
  }

  const cerrarGestion = () => {
    setGestionOpen(false)
    setReclamoGestion(null)
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

  const esResuelto = reclamoAEliminar?.estado === 'Resuelto'
  const mensajeConfirmacion = esResuelto
    ? `Este reclamo ya está marcado como Resuelto. Si lo eliminás, se pierde el registro de esa gestión. ¿Eliminar "${reclamoAEliminar?.titulo}" igualmente?`
    : `¿Eliminar el reclamo "${reclamoAEliminar?.titulo}"? Esta acción no se puede deshacer.`

  // 1. Filtramos y ordenamos cronológicamente (los más antiguos arriba).
  const reclamosFiltrados = useMemo(() => {
    const busqueda = filtroTexto.toLowerCase()
    return (reclamos || [])
      .filter((r) => {
        const cumpleTexto =
          !busqueda ||
          (r.inquilinos?.nombre_completo ?? '').toLowerCase().includes(busqueda) ||
          (r.propiedades?.direccion ?? '').toLowerCase().includes(busqueda) ||
          (r.titulo ?? '').toLowerCase().includes(busqueda) ||
          (r.categoria ?? '').toLowerCase().includes(busqueda)

        const cumpleEstado = !filtroEstado || r.estado === filtroEstado
        const cumplePrioridad = !filtroPrioridad || r.prioridad === filtroPrioridad
        const cumpleCategoria = !filtroCategoria || r.categoria === filtroCategoria

        return cumpleTexto && cumpleEstado && cumplePrioridad && cumpleCategoria
      })
      .sort((a, b) => {
        const fechaA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0
        const fechaB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0
        return fechaA - fechaB
      })
  }, [reclamos, filtroTexto, filtroEstado, filtroPrioridad, filtroCategoria])

  // 2. Paginado.
  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(reclamosFiltrados.length / FILAS_POR_PAGINA)),
    [reclamosFiltrados.length]
  )

  const reclamosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return reclamosFiltrados.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [reclamosFiltrados, paginaActual])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroTexto, filtroEstado, filtroPrioridad, filtroCategoria])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  return (
    <>
      <AdminListLayout
        title="Reclamos"
        subtitle="Pedidos de mantenimiento por inquilino y propiedad, desde la carga hasta su resolución."
        actions={<AdminNuevoButton label="Nuevo reclamo" onClick={abrirModalCrear} />}
        alerts={
          error || actionError ? (
            <div className="space-y-2">
              {error && <div className={calloutClass('danger')}>Error al cargar reclamos: {error}</div>}
              {actionError && <div className={calloutClass('danger')}>{actionError}</div>}
            </div>
          ) : null
        }
        summary={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              compact
              label="Pendientes"
              value={loading ? '…' : kpis.pendientes}
              hint="Recién cargados, sin gestionar"
              icon="clipboard"
              theme={!loading && kpis.pendientes > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              compact
              label="En atención"
              value={loading ? '…' : kpis.enAtencion}
              hint="En proceso o en revisión"
              icon="wrench"
              theme="slate"
            />
            <StatCard
              compact
              label="Urgentes"
              value={loading ? '…' : kpis.urgentes}
              hint="Prioridad urgente sin resolver"
              icon="alert"
              theme={!loading && kpis.urgentes > 0 ? 'red' : 'slate'}
            />
            <StatCard
              compact
              label="Resueltos"
              value={loading ? '…' : kpis.resueltos}
              hint="Ya cerrados"
              icon="check"
              theme="emerald"
            />
          </div>
        }
      >
        <AdminTableToolbar className="sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-reclamo"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por inquilino o propiedad…"
              className={cn(inputClass, 'pl-9')}
            />
          </div>

          <FilterSelect
            id="filtro-estado-reclamo"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            onClear={() => setFiltroEstado('')}
            ariaLabel="Filtrar por estado"
          >
            <option value="">Estado: Todos</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="filtro-prioridad-reclamo"
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            onClear={() => setFiltroPrioridad('')}
            ariaLabel="Filtrar por prioridad"
          >
            <option value="">Prioridad: Todas</option>
            {prioridades.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="filtro-categoria-reclamo"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            onClear={() => setFiltroCategoria('')}
            ariaLabel="Filtrar por categoría"
          >
            <option value="">Categoría: Todas</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </FilterSelect>
        </AdminTableToolbar>

        <AdminTable className="w-full">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Reclamo</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_FECHA}>Fecha</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_PRIORIDAD} !text-center`}>
                Prioridad
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_ESTADO} !text-center`}>
                Estado
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-36 whitespace-nowrap !text-center">
                Acciones
              </AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>

          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>Cargando reclamos…</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && reclamosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>
                  {(reclamos || []).length === 0 ? 'No hay reclamos cargados' : 'Ningún reclamo coincide con los filtros'}
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              reclamosPagina.map((r) => {
                return (
                <AdminTableRow key={r.id}>
                  <AdminTableCell className="max-w-[14rem]">
                    <p className={`truncate ${celdaNombre}`}>
                      {r.inquilinos?.nombre_completo ?? '—'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {r.propiedades?.direccion ?? '—'}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <p className={`truncate ${celdaNombre}`}>{r.titulo}</p>
                    <span className="mt-1.5 inline-block">
                      <ReclamoCategoriaChip categoria={r.categoria} />
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_FECHA} ${celdaNumero}`}>
                    {r.fecha_creacion
                      ? new Date(r.fecha_creacion).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_PRIORIDAD} !text-center`}>
                    <ReclamoPrioridadChip prioridad={r.prioridad} />
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_ESTADO} !text-center`}>
                    <ReclamoEstadoChip estado={r.estado} />
                  </AdminTableCell>
                  <AdminTableActionsCell className="w-36">
                    <ReclamoRowActions
                      onView={() => abrirDetalle(r)}
                      onManage={() => abrirGestion(r)}
                      onEdit={() => abrirModalEditar(r)}
                      onDelete={() => handleEliminar(r)}
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
          totalItems={reclamosFiltrados.length}
          itemsPorPagina={FILAS_POR_PAGINA}
          onPaginaChange={setPaginaActual}
        />
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
        propiedades={propiedades}
      />

      <ReclamoDetalleModal
        open={detalleOpen}
        reclamo={reclamoDetalle}
        onClose={cerrarDetalle}
        inquilinos={inquilinos}
        propiedades={propiedades}
        onManage={(r) => {
          cerrarDetalle()
          abrirGestion(r)
        }}
      />

      <ReclamoGestionModal
        open={gestionOpen}
        reclamo={reclamoGestion}
        onClose={cerrarGestion}
        onGestionar={gestionar}
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