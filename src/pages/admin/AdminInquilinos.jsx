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
import InquilinoFormModal from '../../components/admin/forms/InquilinoFormModal'
import InquilinoDetalleModal from '../../components/admin/InquilinoDetalleModal'
import InquilinoRowActions from '../../components/admin/InquilinoRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import FilterSelect from '../../components/admin/FilterSelect'
import { useInquilinos } from '../../hooks/useInquilinos'
import { useToast } from '../../contexts/ToastContext'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import {
  BADGE_PERSONA_TIPO,
  celdaNombre,
  celdaNumero,
  inputToolbarClass,
} from '../../utils/adminModuleUi'
import { IconSearch } from '../../components/icons/Icons'
import { calloutClass } from '../../utils/ui'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const dependenciasIniciales = {
  contratos_activos: 0,
  contratos_programados: 0,
  contratos_historicos: 0,
  reclamos: 0,
}
const FILAS_POR_PAGINA = 4

const MENSAJE_RECLAMOS_ASOCIADOS =
  'No se puede eliminar el inquilino porque tiene reclamos asociados. Se conserva como historial.'

function buildMensajeConfirmacionDelete(inquilino) {
  return `¿Eliminar al inquilino "${inquilino.nombre_completo}"? Esta acción no se puede deshacer.`
}

export default function AdminInquilinos() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [inquilinoEditando, setInquilinoEditando] = useState(null)
  const [dependenciasEditando, setDependenciasEditando] = useState(dependenciasIniciales)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [inquilinoDetalle, setInquilinoDetalle] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [inquilinoAEliminar, setInquilinoAEliminar] = useState(null)
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
    const nombre = form.nombre_completo?.trim()
    if (inquilinoEditando) {
      const ok = await actualizar(inquilinoEditando.id, form)
      if (ok) toast.success('Inquilino actualizado', `Se guardaron los cambios de ${nombre}.`)
      return ok
    }
    const ok = await crear(form)
    if (ok) toast.success('Inquilino creado', `${nombre} quedó registrado. Ya podés asignarle un contrato.`)
    return ok
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

    const totalContratos =
      (dependencias.contratos_activos ?? 0) +
      (dependencias.contratos_programados ?? 0) +
      (dependencias.contratos_historicos ?? 0)
    if (totalContratos > 0 || (dependencias.reclamos ?? 0) > 0) {
      setAlerta({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: totalContratos > 0 ? mensajeContratosAsociados : MENSAJE_RECLAMOS_ASOCIADOS,
      })
      return
    }

    setInquilinoAEliminar(inquilino)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setInquilinoAEliminar(null)
  }

  const confirmarEliminar = async () => {
    if (!inquilinoAEliminar) return

    setEliminando(true)
    const ok = await eliminar(inquilinoAEliminar.id)
    setEliminando(false)

    if (ok) {
      toast.success('Inquilino eliminado', `${inquilinoAEliminar.nombre_completo} se quitó del sistema.`)
      cancelarEliminar()
    }
  }

  const tituloConfirmDelete = 'Eliminar inquilino'

  const mensajeConfirmacion = inquilinoAEliminar ? buildMensajeConfirmacionDelete(inquilinoAEliminar) : ''

  return (
    <>
      <AdminListLayout
        title="Inquilinos"
        subtitle="Personas y empresas que alquilan, con su acceso al portal."
        actions={<AdminNuevoButton label="Nuevo inquilino" onClick={abrirModalCrear} />}
        alerts={
          error ? (
            <div className={calloutClass('danger')}>Error al cargar inquilinos: {error}</div>
          ) : null
        }
      >
        <AdminTableToolbar>
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-inquilino"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre, DNI/CUIT o email…"
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <FilterSelect
            id="filtro-tipo-inquilino"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            onClear={() => setFiltroTipo('')}
            ariaLabel="Filtrar por tipo de inquilino"
          >
            <option value="">Tipo: Todos</option>
            <option value="Física">Persona física</option>
            <option value="Jurídica">Persona jurídica</option>
          </FilterSelect>
        </AdminTableToolbar>

        <AdminTable className="w-full">
          <AdminTableHead>
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[11%] !text-center">
                Tipo
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[24%] !text-left">
                Nombre / Razón social
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[13%] !text-left">
                DNI/CUIT
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[12%] !text-left">
                Teléfono
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando inquilinos…</AdminTableEmptyCell>
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
              inquilinosPagina.map((i) => {
                const badgeTipo = BADGE_PERSONA_TIPO[i.tipo_persona] ?? BADGE_PERSONA_TIPO['Física']

                return (
                  <AdminTableRow key={i.id ?? i.dni_cuit}>
                    <AdminTableCell className="!text-center">
                      <span className={badgeTipo.className}>{badgeTipo.label}</span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-left">
                      <div className="flex flex-col">
                        <span className={`block truncate ${celdaNombre}`}>{i.nombre_completo}</span>
                        {i.ocupacion && (
                          <span className="max-w-[200px] truncate text-xs text-slate-500">
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
