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
import PropiedadFormModal from '../../components/admin/forms/PropiedadFormModal'
import PropiedadDetalleModal from '../../components/admin/PropiedadDetalleModal'
import PropiedadRowActions from '../../components/admin/PropiedadRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import FilterSelect from '../../components/admin/FilterSelect'
import { usePropiedades } from '../../hooks/usePropiedades'
import { usePropietarios } from '../../hooks/usePropietarios'
import { etiquetaPropietario } from '../../utils/etiquetaPropietario'
import { ESTADOS_PROPIEDAD, TIPOS_PROPIEDAD } from '../../utils/validaciones'
import {
  BADGE_PROPIEDAD_ESTADO,
  BADGE_PROPIEDAD_ESTADO_DEFAULT,
  BADGE_PROPIEDAD_TIPO,
  BADGE_PROPIEDAD_TIPO_DEFAULT,
  celdaTexto,
  inputToolbarClass,
} from '../../utils/adminModuleUi'
import { IconSearch } from '../../components/icons/Icons'
import { calloutClass } from '../../utils/ui'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const dependenciasIniciales = { contratos_activos: 0, contratos_historicos: 0, reclamos: 0 }
const FILAS_POR_PAGINA = 4

const celdaDestacada = 'text-sm font-medium text-slate-900'

function CeldaDireccion({ propiedad }) {
  const { calle, altura, piso, unidad, ciudad, direccion } = propiedad

  if (!calle && !altura) {
    return (
      <span className={`block truncate ${celdaDestacada}`} title={direccion}>
        {direccion}
      </span>
    )
  }

  const detalles = []
  if (piso) detalles.push(`Piso ${piso}`)
  if (unidad) detalles.push(`Depto ${unidad}`)
  if (ciudad) detalles.push(ciudad)

  return (
    <div className="min-w-0" title={direccion}>
      <p className="truncate text-sm font-medium leading-snug text-slate-900">
        {calle} {altura}
      </p>
      {detalles.length > 0 && (
        <p className="truncate text-xs leading-snug text-slate-500">{detalles.join(' · ')}</p>
      )}
    </div>
  )
}

function buildMensajeConfirmacionDelete(propiedad, deps) {
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
    return `¡Atención! La propiedad "${propiedad.direccion}" tiene ${partes.join(' y ')} asociados. Si la eliminás, se borrará todo ese historial. ¿Querés continuar?`
  }

  return `¿Eliminar la propiedad "${propiedad.direccion}"? Esta acción no se puede deshacer.`
}

export default function AdminPropiedades() {
  const [modalOpen, setModalOpen] = useState(false)
  const [propiedadEditando, setPropiedadEditando] = useState(null)
  const [dependenciasEditando, setDependenciasEditando] = useState(dependenciasIniciales)
  const [alerta, setAlerta] = useState(alertaInicial)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [propiedadAEliminar, setPropiedadAEliminar] = useState(null)
  const [dependenciasEliminar, setDependenciasEliminar] = useState(dependenciasIniciales)
  const [eliminando, setEliminando] = useState(false)
  const [confirmCambioPropietario, setConfirmCambioPropietario] = useState(false)
  const [pendingForm, setPendingForm] = useState(null)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [propiedadDetalle, setPropiedadDetalle] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const {
    propiedades,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarDependenciasPropiedad,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosActivos,
  } = usePropiedades()
  const { propietarios, loading: propietariosLoading } = usePropietarios()

  useEffect(() => {
    if (!actionError) return
    setAlerta({
      open: true,
      titulo: 'No se puede eliminar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError])

  const propiedadesFiltradas = useMemo(() => {
    const busqueda = filtroTexto.toLowerCase().trim()

    return propiedades.filter((p) => {
      const cumpleTipo = !filtroTipo || p.tipo === filtroTipo
      const cumpleEstado = !filtroEstado || p.estado === filtroEstado
      if (!busqueda) return cumpleTipo && cumpleEstado

      const propietario = etiquetaPropietario(p).toLowerCase()
      const cumpleTexto =
        (p.direccion ?? '').toLowerCase().includes(busqueda) || propietario.includes(busqueda)

      return cumpleTipo && cumpleEstado && cumpleTexto
    })
  }, [propiedades, filtroTexto, filtroTipo, filtroEstado])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroTexto, filtroTipo, filtroEstado])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(propiedadesFiltradas.length / FILAS_POR_PAGINA)),
    [propiedadesFiltradas.length]
  )

  const propiedadesPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return propiedadesFiltradas.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [propiedadesFiltradas, paginaActual])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setPropiedadEditando(null)
      setDependenciasEditando(dependenciasIniciales)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    setPropiedadEditando(null)
    setDependenciasEditando(dependenciasIniciales)
    setModalOpen(true)
  }

  const abrirModalEditar = async (propiedad) => {
    limpiarSubmitError()

    const deps = await contarDependenciasPropiedad(propiedad.id)

    setPropiedadEditando(propiedad)
    setDependenciasEditando(
      deps.error
        ? dependenciasIniciales
        : {
            contratos_activos: deps.contratos_activos,
            contratos_historicos: deps.contratos_historicos,
            reclamos: deps.reclamos,
          }
    )
    setModalOpen(true)
  }

  const abrirDetalle = (propiedad) => {
    setPropiedadDetalle(propiedad)
    setDetalleOpen(true)
  }

  const cerrarDetalle = () => {
    setDetalleOpen(false)
    setPropiedadDetalle(null)
  }

  const handleSubmit = async (form) => {
    if (propiedadEditando) {
      const propietarioCambio =
        dependenciasEditando.contratos_activos > 0 &&
        String(form.propietario_id) !== String(propiedadEditando.propietario_id)

      if (propietarioCambio) {
        setPendingForm(form)
        setConfirmCambioPropietario(true)
        return false
      }

      return actualizar(propiedadEditando.id, form)
    }
    return crear(form)
  }

  const confirmarCambioPropietario = async () => {
    if (!pendingForm || !propiedadEditando) return
    const ok = await actualizar(propiedadEditando.id, pendingForm)
    setConfirmCambioPropietario(false)
    setPendingForm(null)
    if (ok) cerrarModal()
  }

  const cancelarCambioPropietario = () => {
    if (submitting) return
    setConfirmCambioPropietario(false)
    setPendingForm(null)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const mostrarAlerta = (titulo, mensaje) => {
    setAlerta({ open: true, titulo, mensaje })
  }

  const handleEliminar = async (propiedad) => {
    limpiarActionError()

    const dependencias = await contarDependenciasPropiedad(propiedad.id)

    if (dependencias.error) {
      mostrarAlerta('Error', dependencias.error.message)
      return
    }

    if (dependencias.contratos_activos > 0) {
      mostrarAlerta('No se puede eliminar', mensajeContratosActivos)
      return
    }

    setPropiedadAEliminar(propiedad)
    setDependenciasEliminar(dependencias)
    setConfirmOpen(true)
  }

  const cancelarEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setPropiedadAEliminar(null)
    setDependenciasEliminar(dependenciasIniciales)
  }

  const confirmarEliminar = async () => {
    if (!propiedadAEliminar) return

    setEliminando(true)
    const ok = await eliminar(propiedadAEliminar.id)
    setEliminando(false)

    if (ok) {
      cancelarEliminar()
    }
  }

  const tieneHistorial =
    dependenciasEliminar.contratos_historicos > 0 || dependenciasEliminar.reclamos > 0

  const tituloConfirmDelete = tieneHistorial
    ? 'Eliminar propiedad con historial'
    : 'Eliminar propiedad'

  const mensajeConfirmacion = propiedadAEliminar
    ? buildMensajeConfirmacionDelete(propiedadAEliminar, dependenciasEliminar)
    : ''

  return (
    <>
      <AdminListLayout
        title="Propiedades"
        subtitle="Cartera de inmuebles administrados y su estado de ocupación."
        actions={<AdminNuevoButton label="Nueva propiedad" onClick={abrirModalCrear} />}
        alerts={
          error ? (
            <div className={calloutClass('danger')}>Error al cargar propiedades: {error}</div>
          ) : null
        }
      >
        <AdminTableToolbar>
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-propiedad"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por dirección o propietario…"
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <FilterSelect
            id="filtro-tipo-propiedad"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            onClear={() => setFiltroTipo('')}
            ariaLabel="Filtrar por tipo de propiedad"
          >
            <option value="">Tipo: Todos</option>
            {TIPOS_PROPIEDAD.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="filtro-estado-propiedad"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            onClear={() => setFiltroEstado('')}
            ariaLabel="Filtrar por estado de propiedad"
          >
            <option value="">Estado: Todos</option>
            {ESTADOS_PROPIEDAD.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </FilterSelect>
        </AdminTableToolbar>

        <AdminTable className="w-full">
          <AdminTableHead>
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[30%] !text-left">
                Dirección
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">
                Tipo
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">
                Estado
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[24%] !text-left">
                Propietario
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[18%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando propiedades…</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propiedades.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>No hay propiedades cargadas</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && propiedades.length > 0 && propiedadesFiltradas.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>
                  Ninguna propiedad coincide con la búsqueda
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              propiedadesFiltradas.length > 0 &&
              propiedadesPagina.map((p) => {
                const badgeTipo = BADGE_PROPIEDAD_TIPO[p.tipo] ?? { ...BADGE_PROPIEDAD_TIPO_DEFAULT, label: p.tipo }
                const badgeEstado = BADGE_PROPIEDAD_ESTADO[p.estado] ?? { ...BADGE_PROPIEDAD_ESTADO_DEFAULT, label: p.estado }
                const sinPropietario = !p.propietario_id

                return (
                  <AdminTableRow key={p.id}>
                    <AdminTableCell className="!text-left">
                      <CeldaDireccion propiedad={p} />
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <span className={badgeTipo.className}>{badgeTipo.label}</span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <span className={badgeEstado.className}>{badgeEstado.label}</span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-left">
                      <span
                        className={`block truncate ${sinPropietario ? 'italic text-slate-500' : celdaTexto}`}
                        title={etiquetaPropietario(p)}
                      >
                        {etiquetaPropietario(p)}
                      </span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <PropiedadRowActions
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

        {!loading && !error && propiedadesFiltradas.length > 0 && (
          <AdminTablePagination
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            totalItems={propiedadesFiltradas.length}
            itemsPorPagina={FILAS_POR_PAGINA}
            onPaginaChange={setPaginaActual}
          />
        )}
      </AdminListLayout>

      <PropiedadFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        propiedad={propiedadEditando}
        propietarios={propietarios}
        propietariosLoading={propietariosLoading}
        dependenciasPropiedad={dependenciasEditando}
      />

      <PropiedadDetalleModal
        open={detalleOpen}
        propiedad={propiedadDetalle}
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

      <AdminConfirmModal
        open={confirmCambioPropietario}
        title="Cambiar propietario con contrato activo"
        message="Esta propiedad tiene un contrato activo. Estás cambiando el propietario asignado. ¿Querés continuar de todas formas?"
        confirmLabel="Sí, cambiar propietario"
        confirmVariant="primary"
        onConfirm={confirmarCambioPropietario}
        onCancel={cancelarCambioPropietario}
        loading={submitting}
      />
    </>
  )
}
