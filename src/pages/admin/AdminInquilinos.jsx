import { useEffect, useMemo, useState } from 'react'
import { Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import InquilinoFormModal from '../../components/admin/forms/InquilinoFormModal'
import InquilinoDetalleModal from '../../components/admin/InquilinoDetalleModal'
import InquilinoRowActions from '../../components/admin/InquilinoRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import { useInquilinos } from '../../hooks/useInquilinos'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const dependenciasIniciales = {
  contratos_activos: 0,
  contratos_programados: 0,
  contratos_historicos: 0,
  reclamos: 0,
}
const FILAS_POR_PAGINA = 4

const inputToolbarClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const BADGE_TIPO = {
  Física: { label: 'Particular', className: 'bg-violet-600 text-white' },
  Jurídica: { label: 'Empresa', className: 'bg-teal-600 text-white' },
}

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

function IconUser({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  )
}

function IconIdCard({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm3-9.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 3a2.25 2.25 0 0 0-2.25 2.25v.75a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25v-.75A2.25 2.25 0 0 0 10.5 12.75h-3Z"
      />
    </svg>
  )
}

function IconPhone({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.72 1.062a12.042 12.042 0 0 1-7.21-7.21l1.062-.72c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  )
}

function HeaderLabel({ icon: Icon, children, align = 'center' }) {
  const justify = align === 'left' ? 'justify-start' : 'justify-center'
  return (
    <span className={`inline-flex w-full items-center gap-2 text-slate-600 ${justify}`}>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      {children}
    </span>
  )
}

const celdaTexto = 'text-sm text-slate-700'
const celdaNombre = 'text-sm font-medium text-slate-900'
const celdaNumero = 'text-sm text-slate-600'

function buildMensajeConfirmacionDelete(inquilino, deps) {
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
    return `¡Atención! El inquilino "${inquilino.nombre_completo}" tiene ${partes.join(' y ')} asociados. Si lo eliminás, se borrará todo ese historial. ¿Querés continuar?`
  }

  return `¿Eliminar al inquilino "${inquilino.nombre_completo}"? Esta acción no se puede deshacer.`
}

export default function AdminInquilinos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inquilinoEditando, setInquilinoEditando] = useState(null)
  const [dependenciasEditando, setDependenciasEditando] = useState(dependenciasIniciales)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [inquilinoDetalle, setInquilinoDetalle] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [inquilinoAEliminar, setInquilinoAEliminar] = useState(null)
  const [dependenciasEliminar, setDependenciasEliminar] = useState(dependenciasIniciales)
  const [eliminando, setEliminando] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const {
    inquilinos,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarDependenciasInquilino,
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

  const inquilinosFiltrados = useMemo(() => {
    const busqueda = filtroTexto.toLowerCase().trim()

    return (inquilinos || []).filter((i) => {
      const cumpleTexto =
        !busqueda ||
        (i.nombre_completo ?? '').toLowerCase().includes(busqueda) ||
        (i.dni_cuit ?? '').toLowerCase().includes(busqueda) ||
        (i.email ?? '').toLowerCase().includes(busqueda)

      const cumpleTipo = !filtroTipo || i.tipo_persona === filtroTipo

      return cumpleTexto && cumpleTipo
    })
  }, [inquilinos, filtroTexto, filtroTipo])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(inquilinosFiltrados.length / FILAS_POR_PAGINA)),
    [inquilinosFiltrados.length]
  )

  const inquilinosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return inquilinosFiltrados.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [inquilinosFiltrados, paginaActual])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroTexto, filtroTipo])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setInquilinoEditando(null)
      setDependenciasEditando(dependenciasIniciales)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    limpiarActionError()
    setInquilinoEditando(null)
    setDependenciasEditando(dependenciasIniciales)
    setModalOpen(true)
  }

  const abrirModalEditar = async (inquilino) => {
    limpiarSubmitError()
    limpiarActionError()

    const deps = await contarDependenciasInquilino(inquilino.id)

    setInquilinoEditando(inquilino)
    setDependenciasEditando(
      deps.error
        ? dependenciasIniciales
        : {
            contratos_activos: deps.contratos_activos,
            contratos_programados: deps.contratos_programados ?? 0,
            contratos_historicos: deps.contratos_historicos,
            reclamos: deps.reclamos,
          }
    )
    setModalOpen(true)
  }

  const abrirDetalle = (inquilino) => {
    setInquilinoDetalle(inquilino)
    setDetalleOpen(true)
  }

  const cerrarDetalle = () => {
    setDetalleOpen(false)
    setInquilinoDetalle(null)
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

    const dependencias = await contarDependenciasInquilino(inquilino.id)

    if (dependencias.error) {
      setAlerta({ open: true, titulo: 'Error', mensaje: dependencias.error.message })
      return
    }

    if (dependencias.contratos_activos > 0 || dependencias.contratos_programados > 0) {
      setAlerta({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: mensajeContratosAsociados,
      })
      return
    }

    setInquilinoAEliminar(inquilino)
    setDependenciasEliminar(dependencias)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setInquilinoAEliminar(null)
    setDependenciasEliminar(dependenciasIniciales)
  }

  const confirmarEliminar = async () => {
    if (!inquilinoAEliminar) return

    setEliminando(true)
    const ok = await eliminar(inquilinoAEliminar.id)
    setEliminando(false)

    if (ok) {
      cancelarEliminar()
    }
  }

  const tituloConfirmDelete =
    dependenciasEliminar.contratos_historicos > 0 || dependenciasEliminar.reclamos > 0
      ? 'Eliminar inquilino con historial'
      : 'Eliminar inquilino'

  const mensajeConfirmacion = inquilinoAEliminar
    ? buildMensajeConfirmacionDelete(inquilinoAEliminar, dependenciasEliminar)
    : ''

  return (
    <>
      <AdminListLayout
        title="Inquilinos"
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar inquilinos: {error}</p>
            </Card>
          ) : null
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 lg:px-6">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-inquilino"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre, DNI/CUIT o email..."
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <select
            id="filtro-tipo-inquilino"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={`${inputToolbarClass} shrink-0 cursor-pointer sm:w-44`}
            aria-label="Filtrar por tipo de inquilino"
          >
            <option value="">Tipo: Todos</option>
            <option value="Física">Particular</option>
            <option value="Jurídica">Empresa</option>
          </select>

          <div className="shrink-0 sm:ml-auto">
            <AdminNuevoButton
              label="Nuevo inquilino"
              onClick={abrirModalCrear}
              className="!h-10 w-full !px-4 !py-0 sm:w-auto"
            />
          </div>
        </div>

        <AdminTable className="w-full">
          <AdminTableHead className="!bg-slate-100/90">
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[11%] !text-center">
                <HeaderLabel icon={IconUser}>Tipo</HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[24%] !text-left">
                Nombre / Razón social
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[13%] !text-left">
                <HeaderLabel icon={IconIdCard} align="left">
                  DNI/CUIT
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[12%] !text-left">
                <HeaderLabel icon={IconPhone} align="left">
                  Teléfono
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando inquilinos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && inquilinos.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>No hay inquilinos cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && inquilinos.length > 0 && inquilinosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>
                  Ningún inquilino coincide con la búsqueda
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              inquilinosFiltrados.length > 0 &&
              inquilinosPagina.map((i, index) => {
                const badgeTipo = BADGE_TIPO[i.tipo_persona] ?? BADGE_TIPO['Física']
                const zebra = index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'

                return (
                  <AdminTableRow key={i.id ?? i.dni_cuit} className={`${zebra} hover:bg-indigo-50/40`}>
                    <AdminTableCell className="!text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTipo.className}`}
                      >
                        {badgeTipo.label}
                      </span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-left">
                      <div className="flex flex-col">
                        <span className={`block truncate ${celdaNombre}`}>{i.nombre_completo}</span>
                        {i.ocupacion && (
                          <span className="max-w-[200px] truncate text-xs text-slate-400">
                            {i.ocupacion}
                          </span>
                        )}
                      </div>
                    </AdminTableCell>

                    <AdminTableCell className={`!text-left ${celdaNumero}`}>
                      {formatearDniCuit(i.dni_cuit)}
                    </AdminTableCell>

                    <AdminTableCell className={`!text-left ${celdaNumero}`}>
                      {formatearTelefono(i.telefono)}
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <InquilinoRowActions
                        onEdit={() => abrirModalEditar(i)}
                        onDelete={() => handleEliminar(i)}
                        onView={() => abrirDetalle(i)}
                      />
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>

        {!loading && !error && inquilinosFiltrados.length > 0 && (
          <AdminTablePagination
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            totalItems={inquilinosFiltrados.length}
            itemsPorPagina={FILAS_POR_PAGINA}
            onPaginaChange={setPaginaActual}
          />
        )}
      </AdminListLayout>

      <InquilinoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        inquilino={inquilinoEditando}
        dependenciasInquilino={dependenciasEditando}
      />

      <InquilinoDetalleModal
        open={detalleOpen}
        inquilino={inquilinoDetalle}
        onClose={cerrarDetalle}
        onEdit={abrirModalEditar}
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
    </>
  )
}
