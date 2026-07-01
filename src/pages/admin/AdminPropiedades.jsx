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
import PropiedadFormModal from '../../components/admin/forms/PropiedadFormModal'
import PropiedadDetalleModal from '../../components/admin/PropiedadDetalleModal'
import PropiedadRowActions from '../../components/admin/PropiedadRowActions'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import { usePropiedades } from '../../hooks/usePropiedades'
import { usePropietarios } from '../../hooks/usePropietarios'
import { etiquetaPropietario } from '../../utils/etiquetaPropietario'
import { ESTADOS_PROPIEDAD, TIPOS_PROPIEDAD } from '../../utils/validaciones'
import {
  BADGE_PROPIEDAD_ESTADO,
  BADGE_PROPIEDAD_TIPO,
  celdaTexto,
  inputToolbarClass,
  selectToolbarClass,
} from '../../utils/adminModuleUi'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }
const dependenciasIniciales = { contratos_activos: 0, contratos_historicos: 0, reclamos: 0 }
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

function IconHome({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function IconSignal({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
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
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar propiedades: {error}</p>
            </Card>
          ) : null
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 lg:px-6">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-propiedad"
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por dirección o propietario..."
              className={`${inputToolbarClass} pl-9`}
            />
          </div>

          <select
            id="filtro-tipo-propiedad"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={selectToolbarClass}
            aria-label="Filtrar por tipo de propiedad"
          >
            <option value="">Tipo: Todos</option>
            {TIPOS_PROPIEDAD.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          <select
            id="filtro-estado-propiedad"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={selectToolbarClass}
            aria-label="Filtrar por estado de propiedad"
          >
            <option value="">Estado: Todos</option>
            {ESTADOS_PROPIEDAD.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          <div className="shrink-0 sm:ml-auto">
            <AdminNuevoButton
              label="NUEVA PROPIEDAD"
              onClick={abrirModalCrear}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        <AdminTable className="w-full">
          <AdminTableHead className="!bg-slate-100/90">
            <AdminTableRow className="hover:bg-transparent">
              <AdminTableHeaderCell className="w-[30%] !text-left">
                Dirección
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">
                <HeaderLabel icon={IconHome}>Tipo</HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-center">
                <HeaderLabel icon={IconSignal}>Estado</HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[24%] !text-left">
                <HeaderLabel icon={IconUser} align="left">
                  Propietario
                </HeaderLabel>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[18%] !text-center">Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={5}>Cargando propiedades...</AdminTableEmptyCell>
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
              propiedadesPagina.map((p, index) => {
                const badgeTipo = BADGE_PROPIEDAD_TIPO[p.tipo] ?? {
                  label: p.tipo,
                  className: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
                }
                const badgeEstado = BADGE_PROPIEDAD_ESTADO[p.estado] ?? {
                  label: p.estado,
                  className: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
                }
                const zebra = index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                const sinPropietario = !p.propietario_id

                return (
                  <AdminTableRow key={p.id} className={`${zebra} hover:bg-brand-50/40`}>
                    <AdminTableCell className="!text-left">
                      <CeldaDireccion propiedad={p} />
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTipo.className}`}
                      >
                        {badgeTipo.label}
                      </span>
                    </AdminTableCell>

                    <AdminTableCell className="!text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeEstado.className}`}
                      >
                        {badgeEstado.label}
                      </span>
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
