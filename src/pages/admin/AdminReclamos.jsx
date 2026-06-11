import { useState } from 'react'
import { Badge, Card } from '@tremor/react'
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
import ReclamoFormModal from '../../components/admin/forms/ReclamoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useContratos } from '../../hooks/useContratos'
import { useReclamos } from '../../hooks/useReclamos'

const estadoColor = {
  Pendiente: '',
  'En Proceso': '',
  Resuelto: '',
}

const estados = ['Pendiente', 'En Proceso', 'Revision', 'Resuelto']
const prioridades = ['Baja', 'Media', 'Alta', 'Urgente']

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reclamoAEliminar, setReclamoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
 
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
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

  const prioridadColor = {
    Urgente: '',
    Alta: '',
    Media: '',
    Baja: '',
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
        actionLabel="Nuevo reclamo"
        onAction={abrirModalCrear}
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
      >
        {/* Banner de reclamos urgentes en cola */}
        {cantidadUrgentes > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/60 px-4 py-2.5 text-sm text-red-800 shadow-sm animate-pulse">
            <span className="flex h-2 w-2 rounded-full bg-red-600" />
            <p className="font-medium">
              Atención: Hay <span className="font-bold underline">{cantidadUrgentes}</span> {cantidadUrgentes === 1 ? 'reclamo urgente' : 'reclamos urgentes'} pendientes de resolución.
            </p>
          </div>
        )}

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-4 shadow-sm">
          {/* Búsqueda por Texto */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-texto" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar</label>
            <div className="relative">
              <input
                id="search-texto"
                type="text"
                placeholder="Inquilino, propiedad, título..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Filtro por Estado */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-estado" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</label>
            <select
              id="search-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-prioridad" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</label>
            <select
              id="search-prioridad"
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todas las prioridades</option>
              {prioridades.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoría */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-categoria" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CATEGORIAS</label>
            <select
              id="search-categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Categoria</AdminTableHeaderCell>
              <AdminTableHeaderCell>Descripción</AdminTableHeaderCell>
              <AdminTableHeaderCell>Fecha de Creación</AdminTableHeaderCell>
              <AdminTableHeaderCell>Prioridad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
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
                  <AdminTableCell>
                    {r.categoria ? (
                      <Badge color="slate" variant="secondary">
                        {r.categoria}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 italic">Sin categoría</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <p className="font-medium text-slate-900">{r.titulo}</p>
                    {r.descripcion && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{r.descripcion}</p>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.fecha_creacion
                      ? new Date(r.fecha_creacion).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge color={prioridadColor[r.prioridad] ?? 'slate'}>
                      {r.prioridad ?? 'No asignada'}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge color={estadoColor[r.estado] ?? 'slate'}>{r.estado}</Badge>
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