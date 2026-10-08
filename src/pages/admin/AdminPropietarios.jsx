import { useEffect, useMemo, useState } from 'react'
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
  AdminTableToolbar,
} from '../../components/admin/AdminDataTable'
import PropietarioFormModal from '../../components/admin/forms/PropietarioFormModal'
import PropietarioDetalleModal from '../../components/admin/PropietarioDetalleModal'
import PropietarioRowActions from '../../components/admin/PropietarioRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import FilterSelect from '../../components/admin/FilterSelect'
import { usePropietarios } from '../../hooks/usePropietarios'
import { useToast } from '../../contexts/ToastContext'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import {
  BADGE_PROPIETARIO_TIPO,
  celdaNombre,
  celdaNumero,
  celdaTexto,
  inputToolbarClass,
} from '../../utils/adminModuleUi'
import { IconSearch } from '../../components/icons/Icons'
import { calloutClass } from '../../utils/ui'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const FILAS_POR_PAGINA = 4

export default function AdminPropietarios() {
  const toast = useToast()
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
    const nombre = form.nombre_completo?.trim()
    if (propietarioEditando) {
      const ok = await actualizar(propietarioEditando.id, form)
      if (ok) toast.success('Propietario actualizado', `Se guardaron los cambios de ${nombre}.`)
      return ok
    }
    const ok = await crear(form)
    if (ok) toast.success('Propietario creado', `${nombre} ya está disponible para asignarle propiedades.`)
    return ok
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
      toast.success('Propietario eliminado', `${propietarioAEliminar.nombre_completo} se quitó del sistema.`)
      cancelarEliminar()
    }
  }

  return (
    <>
      <AdminListLayout
        title="Propietarios"
        subtitle="Personas y empresas dueñas de las propiedades administradas."
        actions={<AdminNuevoButton label="Nuevo propietario" onClick={abrirModalCrear} />}
        alerts={
          error ? <div className={calloutClass('danger')}>Error al cargar propietarios: {error}</div> : null
        }
      >
        <AdminTableToolbar>
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-propietario"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre, DNI/CUIT o email…"
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <FilterSelect
            id="filtro-tipo-propietario"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            onClear={() => setFiltroTipo('')}
            ariaLabel="Filtrar por tipo de propietario"
          >
            <option value="">Tipo: Todos</option>
            <option value="Física">Particular</option>
            <option value="Jurídica">Empresa</option>
          </FilterSelect>
        </AdminTableToolbar>

        <AdminTable className="w-full">
          <AdminTableHead>
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[11%] !text-center">
                Tipo
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[22%] !text-left">
                Nombre / Razón social
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[13%] whitespace-nowrap !text-left">
                DNI/CUIT
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[12%] whitespace-nowrap !text-left">
                Teléfono
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[18%] !text-left">
                Email
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[10%] !text-center">
                Propiedades
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>Cargando propietarios…</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propietarios.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>No hay propietarios cargados</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propietarios.length > 0 && propietariosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>
                  Ningún propietario coincide con la búsqueda
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              propietariosFiltrados.length > 0 &&
              propietariosPagina.map((p) => {
                const badge = BADGE_PROPIETARIO_TIPO[p.tipo_persona] ?? BADGE_PROPIETARIO_TIPO['Física']

                return (
                  <AdminTableRow key={p.id ?? p.dni_cuit}>
                    <AdminTableCell className="!text-center">
                      <span className={badge.className}>{badge.label}</span>
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

                    <AdminTableCell className={`!text-center ${celdaNumero}`}>
                      <span
                        className={
                          (p.cantidad_propiedades ?? 0) > 0 ? 'text-slate-800' : 'text-slate-400'
                        }
                      >
                        {p.cantidad_propiedades ?? 0}
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
