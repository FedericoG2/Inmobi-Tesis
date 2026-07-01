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
import PropietarioFormModal from '../../components/admin/forms/PropietarioFormModal'
import PropietarioDetalleModal from '../../components/admin/PropietarioDetalleModal'
import PropietarioRowActions from '../../components/admin/PropietarioRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import { usePropietarios } from '../../hooks/usePropietarios'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import {
  BADGE_PROPIETARIO_TIPO,
  celdaNombre,
  celdaNumero,
  celdaTexto,
  inputToolbarClass,
  selectToolbarClass,
} from '../../utils/adminModuleUi'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const FILAS_POR_PAGINA = 4

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

function IconEnvelope({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
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

export default function AdminPropietarios() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propietarioEditando, setPropietarioEditando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [propietarioAEliminar, setPropietarioAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [propietarioDetalle, setPropietarioDetalle] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const {
    propietarios,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarPropiedadesPorPropietario,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajePropiedadesAsociadas,
  } = usePropietarios()

  useEffect(() => {
    if (!actionError) return
    setAlerta({
      open: true,
      titulo: 'No se puede eliminar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError])

  const propietariosFiltrados = useMemo(() => {
    const busqueda = filtroTexto.toLowerCase().trim()
    const busquedaDigitos = busqueda.replace(/\D/g, '')

    return propietarios.filter((p) => {
      const cumpleTipo = !filtroTipo || p.tipo_persona === filtroTipo
      if (!busqueda) return cumpleTipo

      const cumpleTexto =
        (p.nombre_completo ?? '').toLowerCase().includes(busqueda) ||
        (p.email ?? '').toLowerCase().includes(busqueda) ||
        formatearDniCuit(p.dni_cuit).toLowerCase().includes(busqueda) ||
        (busquedaDigitos.length > 0 && (p.dni_cuit ?? '').includes(busquedaDigitos))

      return cumpleTipo && cumpleTexto
    })
  }, [propietarios, filtroTexto, filtroTipo])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroTexto, filtroTipo])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(propietariosFiltrados.length / FILAS_POR_PAGINA)),
    [propietariosFiltrados.length]
  )

  const propietariosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return propietariosFiltrados.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [propietariosFiltrados, paginaActual])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setPropietarioEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    limpiarActionError()
    setPropietarioEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (propietario) => {
    limpiarSubmitError()
    limpiarActionError()
    setPropietarioEditando(propietario)
    setModalOpen(true)
  }

  const abrirDetalle = (propietario) => {
    setPropietarioDetalle(propietario)
    setDetalleOpen(true)
  }

  const cerrarDetalle = () => {
    setDetalleOpen(false)
    setPropietarioDetalle(null)
  }

  const handleSubmit = async (form) => {
    if (propietarioEditando) {
      return actualizar(propietarioEditando.id, form)
    }
    return crear(form)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const handleEliminar = async (propietario) => {
    limpiarActionError()

    const dependencias = await contarPropiedadesPorPropietario(propietario.id)

    if (dependencias.error) {
      setAlerta({
        open: true,
        titulo: 'Error',
        mensaje: dependencias.error.message,
      })
      return
    }

    if (dependencias.propiedades > 0) {
      setAlerta({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: mensajePropiedadesAsociadas,
      })
      return
    }

    setPropietarioAEliminar(propietario)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setPropietarioAEliminar(null)
  }

  const confirmarEliminar = async () => {
    if (!propietarioAEliminar) return

    setEliminando(true)
    const ok = await eliminar(propietarioAEliminar.id)
    setEliminando(false)

    if (ok) {
      cancelarEliminar()
    }
  }

  return (
    <>
      <AdminListLayout
        title="Propietarios"
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar propietarios: {error}</p>
            </Card>
          ) : null
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 lg:px-6">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-propietario"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre, DNI/CUIT o email..."
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <select
            id="filtro-tipo-propietario"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={selectToolbarClass}
            aria-label="Filtrar por tipo de propietario"
          >
            <option value="">Tipo: Todos</option>
            <option value="Física">Particular</option>
            <option value="Jurídica">Empresa</option>
          </select>

          <div className="shrink-0 sm:ml-auto">
            <AdminNuevoButton
              label="NUEVO PROPIETARIO"
              onClick={abrirModalCrear}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        <AdminTable className="w-full">
          <AdminTableHead className="!bg-slate-100/90">
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[11%] !text-center">
                <HeaderLabel icon={IconUser}>Tipo</HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[27%] !text-left">
                Nombre / Razón social
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] whitespace-nowrap !text-left">
                <HeaderLabel icon={IconIdCard} align="left">
                  DNI/CUIT
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[12%] whitespace-nowrap !text-left">
                <HeaderLabel icon={IconPhone} align="left">
                  Teléfono
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[22%] !text-left">
                <HeaderLabel icon={IconEnvelope} align="left">
                  Email
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>Cargando propietarios...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propietarios.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>No hay propietarios cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propietarios.length > 0 && propietariosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={6}>
                  Ningún propietario coincide con la búsqueda
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              propietariosFiltrados.length > 0 &&
              propietariosPagina.map((p, index) => {
                const badge = BADGE_PROPIETARIO_TIPO[p.tipo_persona] ?? BADGE_PROPIETARIO_TIPO['Física']
                const zebra = index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'

                return (
                  <AdminTableRow key={p.id ?? p.dni_cuit} className={`${zebra} hover:bg-brand-50/40`}>
                    <AdminTableCell className="!text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-left">
                      <span className={`block truncate ${celdaNombre}`}>{p.nombre_completo}</span>
                    </AdminTableCell>

                    <AdminTableCell className={`!text-left ${celdaNumero}`}>
                      {formatearDniCuit(p.dni_cuit)}
                    </AdminTableCell>

                    <AdminTableCell className={`!text-left ${celdaNumero}`}>
                      {formatearTelefono(p.telefono)}
                    </AdminTableCell>

                    <AdminTableCell className="max-w-0 !text-left">
                      <span className={`block truncate ${celdaTexto}`} title={p.email}>
                        {p.email}
                      </span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <PropietarioRowActions
                        onEdit={() => abrirModalEditar(p)}
                        onDelete={() => handleEliminar(p)}
                        onView={() => abrirDetalle(p)}
                      />
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>

        {!loading && !error && propietariosFiltrados.length > 0 && (
          <AdminTablePagination
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            totalItems={propietariosFiltrados.length}
            itemsPorPagina={FILAS_POR_PAGINA}
            onPaginaChange={setPaginaActual}
          />
        )}
      </AdminListLayout>

      <PropietarioFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        propietario={propietarioEditando}
      />

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />

      <PropietarioDetalleModal
        open={detalleOpen}
        propietario={propietarioDetalle}
        onClose={cerrarDetalle}
        onEdit={abrirModalEditar}
      />

      <AdminConfirmModal
        open={confirmOpen}
        title="Eliminar propietario"
        message={`¿Eliminar al propietario "${propietarioAEliminar?.nombre_completo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        loading={eliminando}
      />
    </>
  )
}
