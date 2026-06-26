import { useState } from 'react'
import { Card } from '@tremor/react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
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
import ReclamoFormModal from '../../components/admin/forms/ReclamoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useContratos } from '../../hooks/useContratos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { useReclamos } from '../../hooks/useReclamos'
import {
  badgeCategoria,
  badgeEstado,
  badgePrioridad,
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

const estados = ['Pendiente', 'En Proceso', 'Revision', 'Resuelto']
const prioridades = ['Baja', 'Media', 'Alta', 'Urgente']

const COL_CATEGORIA = 'w-[8.5rem]'
const COL_FECHA = 'w-[7.5rem]'
const COL_PRIORIDAD = 'w-[6.75rem]'
const COL_ESTADO = 'w-[8.75rem]'

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

const inputToolbarClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reclamoAEliminar, setReclamoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
 
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

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
    actionError,
    limpiarActionError,
  } = useReclamos()
 
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { contratos, loading: contratosLoading } = useContratos()
  const { propiedades } = usePropiedades()

  const cantidadUrgentes = (reclamos || []).filter(
    r => r.prioridad === 'Urgente' && r.estado !== 'Resuelto'
  ).length

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

  // 1. Primero filtramos el array original
  const reclamosProcesados = (reclamos || []).filter((r) => {
    const busqueda = filtroTexto.toLowerCase()
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

  // 2. Ordenamos cronológicamente: los más antiguos (primeros creados) van arriba
  const reclamosFiltrados = reclamosProcesados.sort((a, b) => {
    const fechaA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0
    const fechaB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0
    return fechaA - fechaB
  })

  return (
    <>
      <AdminListLayout
        title="Reclamos"
        subtitle="Tickets de mantenimiento por inquilino y propiedad (contrato activo al crear)"
        alerts={
          <>
            {cantidadUrgentes > 0 && (
              <Card className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-2.5">
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse" />
                <p className="text-sm font-medium text-red-800">
                  Atención: hay <span className="font-bold underline">{cantidadUrgentes}</span>{' '}
                  {cantidadUrgentes === 1 ? 'reclamo urgente' : 'reclamos urgentes'} pendientes de
                  resolución.
                </p>
              </Card>
            )}
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
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:px-6">
          <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-reclamo"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por inquilino, propiedad o título..."
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <select
            id="filtro-estado-reclamo"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={`${inputToolbarClass} sm:w-44 shrink-0 cursor-pointer`}
            aria-label="Filtrar por estado"
          >
            <option value="">Estado: Todos</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <select
            id="filtro-prioridad-reclamo"
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className={`${inputToolbarClass} sm:w-44 shrink-0 cursor-pointer`}
            aria-label="Filtrar por prioridad"
          >
            <option value="">Prioridad: Todas</option>
            {prioridades.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            id="filtro-categoria-reclamo"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className={`${inputToolbarClass} sm:w-44 shrink-0 cursor-pointer`}
            aria-label="Filtrar por categoría"
          >
            <option value="">Categoría: Todas</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

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
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_CATEGORIA} !text-center`}>
                Categoría
              </AdminTableHeaderCell>
              <AdminTableHeaderCell>Descripción</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_FECHA}>Fecha de Creación</AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_PRIORIDAD} !text-center`}>
                Prioridad
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_ESTADO} !text-center`}>
                Estado
              </AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>

          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>Cargando reclamos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && reclamosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>
                  {(reclamos || []).length === 0 ? 'No hay reclamos cargados' : 'Ningún reclamo coincide con los filtros'}
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              reclamosFiltrados.map((r) => (
                <AdminTableRow key={r.id}>
                  <AdminTableCell>{r.inquilinos?.nombre_completo ?? '—'}</AdminTableCell>
                  <AdminTableCell className="max-w-xs">{r.propiedades?.direccion ?? '—'}</AdminTableCell>
                  <AdminTableCell className={`${COL_CATEGORIA} !text-center`}>
                    <ReclamoPill badge={badgeCategoria(r.categoria)} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <p className="font-medium text-slate-900">{r.titulo}</p>
                    {r.descripcion && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{r.descripcion}</p>
                    )}
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
                  <AdminTableActionsCell>
                    <TableRowActions
                      onEdit={() => abrirModalEditar(r)}
                      onDelete={() => handleEliminar(r)}
                    />
                  </AdminTableActionsCell>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>
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