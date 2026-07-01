import { useEffect, useMemo, useState } from 'react'
import { Card } from '@tremor/react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import FilterSelect, { toolbarInputClass } from '../../components/admin/FilterSelect'
import ReclamoFormModal from '../../components/admin/forms/ReclamoFormModal'
import ReclamoDetalleModal from '../../components/admin/ReclamoDetalleModal'
import ReclamoGestionModal from '../../components/admin/ReclamoGestionModal'
import StatCard from '../../components/admin/StatCard'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useContratos } from '../../hooks/useContratos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { useReclamos } from '../../hooks/useReclamos'
import {
  badgeEstado,
  badgePrioridad,
  infoCategoria,
  PILL_SOLID_CLASS,
} from '../../utils/reclamosUi'

function ReclamoPill({ badge }) {
  if (!badge) return <span className="text-slate-400">—</span>
  return (
    <span className={`${PILL_SOLID_CLASS} ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function CategoriaChip({ categoria }) {
  const info = infoCategoria(categoria)
  if (!info) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
      <span className="text-sm leading-none">{info.icon}</span>
      <span>{info.label}</span>
    </span>
  )
}

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

function IconSearch({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}

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
      sinResolver: lista.filter(noResuelto).length,
      urgentes: lista.filter((r) => r.prioridad === 'Urgente' && noResuelto(r)).length,
      pendientes: lista.filter((r) => r.estado === 'Pendiente').length,
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
        compact
        title="Reclamos"
        subtitle="Tickets de mantenimiento por inquilino y propiedad (contrato activo al crear)"
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
        summary={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Sin resolver"
              value={loading ? '…' : kpis.sinResolver}
              icon="clipboard"
              theme="indigo"
            />
            <StatCard
              label="Urgentes"
              value={loading ? '…' : kpis.urgentes}
              icon="alert"
              theme={kpis.urgentes > 0 ? 'red' : 'slate'}
            />
            <StatCard
              label="Pendientes"
              value={loading ? '…' : kpis.pendientes}
              icon="wrench"
              theme="amber"
            />
            <StatCard
              label="Resueltos"
              value={loading ? '…' : kpis.resueltos}
              icon="check"
              theme="emerald"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:px-6">
          <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-reclamo"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar reclamos..."
              className={`${toolbarInputClass} pl-9`}
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

          <div className="shrink-0 sm:ml-auto">
            <AdminNuevoButton
              label="NUEVO RECLAMO"
              onClick={abrirModalCrear}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        <AdminTable>
          <AdminTableHead className="!bg-slate-100/90">
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
              <AdminTableHeaderCell className="w-40 whitespace-nowrap text-center">
                Acciones
              </AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>

          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>Cargando reclamos...</AdminTableEmptyCell>
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
              reclamosPagina.map((r) => (
                <AdminTableRow key={r.id}>
                  <AdminTableCell className="max-w-[14rem]">
                    <p className="font-medium text-slate-900">
                      {r.inquilinos?.nombre_completo ?? '—'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {r.propiedades?.direccion ?? '—'}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <p className="truncate font-medium text-slate-900">{r.titulo}</p>
                    <span className="mt-1 inline-block">
                      <CategoriaChip categoria={r.categoria} />
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_FECHA} tabular-nums`}>
                    {r.fecha_creacion
                      ? new Date(r.fecha_creacion).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_PRIORIDAD} !text-center`}>
                    <ReclamoPill badge={badgePrioridad(r.prioridad)} />
                  </AdminTableCell>
                  <AdminTableCell className={`${COL_ESTADO} !text-center`}>
                    <ReclamoPill badge={badgeEstado(r.estado)} />
                  </AdminTableCell>
                  <AdminTableCell className="w-40">
                    <div className="flex items-center justify-center gap-2">
                      <TableRowActions
                        onView={() => abrirDetalle(r)}
                        onManage={() => abrirGestion(r)}
                        onEdit={() => abrirModalEditar(r)}
                        onDelete={() => handleEliminar(r)}
                      />
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
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