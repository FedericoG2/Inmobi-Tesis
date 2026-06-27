import { useEffect, useMemo, useState } from 'react'
import { Badge, Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import StatCard from '../../components/admin/StatCard'
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
import ContratoDetalleModal from '../../components/admin/ContratoDetalleModal'
import ContratoFormModal from '../../components/admin/forms/ContratoFormModal'
import ContratoRowActions from '../../components/admin/ContratoRowActions'
import InquilinoDetalleModal from '../../components/admin/InquilinoDetalleModal'
import PropiedadDetalleModal from '../../components/admin/PropiedadDetalleModal'
import { useContratos } from '../../hooks/useContratos'
import { useInquilinos } from '../../hooks/useInquilinos'
import { usePropiedades } from '../../hooks/usePropiedades'
import { periodicidadLabelPorMeses, TIPO_AJUSTE_LABELS, TIPO_AJUSTE_OPCIONES } from '../../utils/contratoAumentosPreview'
import {
  colorEstadoContrato,
  esContratoPlazoVencido,
  etiquetaEstadoContrato,
  hoyIsoLocal,
  mensajeConfirmacionFinalizarContrato,
} from '../../utils/contratoVigencia'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

const FILAS_POR_PAGINA = 4

const VENCE_PRONTO_DIAS = 60

const FILTRO_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'programados', label: 'Programados' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'vencidos', label: 'Vencidos' },
  { value: 'todos', label: 'Todos' },
]

const FILTRO_TIPO_AJUSTE = [
  { value: 'todos', label: 'Todos los ajustes' },
  ...TIPO_AJUSTE_OPCIONES.map(({ value, label }) => ({ value, label })),
]

const inputToolbarClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50'

function IconSearch({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function normalizarBusqueda(texto) {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)

const formatMontoCompacto = (monto) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto || 0)

const sumarDiasIso = (iso, dias) => {
  const [year, month, day] = iso.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  fecha.setDate(fecha.getDate() + dias)
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const formatVigencia = (inicio, fin) => {
  if (!inicio && !fin) return '—'
  return `${formatFecha(inicio)} - ${formatFecha(fin)}`
}

export default function AdminContratos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroTipoAjuste, setFiltroTipoAjuste] = useState('todos')
  const [busquedaInquilino, setBusquedaInquilino] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAnularOpen, setConfirmAnularOpen] = useState(false)
  const [contratoFinalizando, setContratoFinalizando] = useState(null)
  const [contratoAnulando, setContratoAnulando] = useState(null)
  const [contratoDetalleId, setContratoDetalleId] = useState(null)
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)
  const [inquilinoDetalle, setInquilinoDetalle] = useState(null)
  const [propiedadDetalle, setPropiedadDetalle] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [alerta, setAlerta] = useState(alertaInicial)
  const {
    contratos,
    loading,
    error,
    crear,
    finalizar,
    anular,
    submitting,
    submitError,
    limpiarSubmitError,
    finalizando,
    anulando,
    actionError,
    limpiarActionError,
    mensajeMovimientos,
    mensajeSoloInactivo,
  } = useContratos()
  const { inquilinos, loading: inquilinosLoading } = useInquilinos()
  const { propiedades, loading: propiedadesLoading, refetch: refetchPropiedades } = usePropiedades()

  const conteosEstado = useMemo(
    () => ({
      activos: contratos.filter((c) => c.estado === 'activo').length,
      programados: contratos.filter((c) => c.estado === 'programado').length,
      inactivos: contratos.filter((c) => c.estado === 'inactivo').length,
      vencidos: contratos.filter((c) => esContratoPlazoVencido(c)).length,
      todos: contratos.length,
    }),
    [contratos]
  )

  const resumen = useMemo(() => {
    const hoy = hoyIsoLocal()
    const limiteVencimiento = sumarDiasIso(hoy, VENCE_PRONTO_DIAS)
    const activos = contratos.filter((c) => c.estado === 'activo')
    const ingresoMensual = activos.reduce(
      (acc, c) => acc + (Number(c.monto_alquiler) || 0),
      0
    )
    const porVencer = activos.filter(
      (c) => c.fecha_fin && c.fecha_fin >= hoy && c.fecha_fin <= limiteVencimiento
    ).length
    const vencidos = contratos.filter((c) => esContratoPlazoVencido(c)).length

    return {
      activos: activos.length,
      ingresoMensual,
      porVencer,
      vencidos,
    }
  }, [contratos])

  const contratosFiltrados = useMemo(() => {
    let items = contratos

    if (filtroEstado === 'activos') {
      items = items.filter((c) => c.estado === 'activo')
    } else if (filtroEstado === 'programados') {
      items = items.filter((c) => c.estado === 'programado')
    } else if (filtroEstado === 'inactivos') {
      items = items.filter((c) => c.estado === 'inactivo')
    } else if (filtroEstado === 'vencidos') {
      items = items.filter((c) => esContratoPlazoVencido(c))
    }

    if (filtroTipoAjuste !== 'todos') {
      items = items.filter((c) => c.tipo_ajuste === filtroTipoAjuste)
    }

    const termino = normalizarBusqueda(busquedaInquilino.trim())
    if (termino) {
      items = items.filter((c) =>
        normalizarBusqueda(c.inquilinos?.nombre_completo).includes(termino)
      )
    }

    return items
  }, [contratos, filtroEstado, filtroTipoAjuste, busquedaInquilino])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroEstado, filtroTipoAjuste, busquedaInquilino])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(contratosFiltrados.length / FILAS_POR_PAGINA)),
    [contratosFiltrados.length]
  )

  const contratosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return contratosFiltrados.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [contratosFiltrados, paginaActual])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const hayFiltrosExtra =
    filtroTipoAjuste !== 'todos' || busquedaInquilino.trim().length > 0

  const mensajeListadoVacio = useMemo(() => {
    if (loading) return 'Cargando contratos...'
    if (contratos.length === 0) return 'No hay contratos cargados'
    if (contratosFiltrados.length === 0 && hayFiltrosExtra) {
      return 'No hay contratos que coincidan con la búsqueda o los filtros aplicados'
    }
    if (filtroEstado === 'activos') return 'No hay contratos activos'
    if (filtroEstado === 'programados') return 'No hay contratos programados'
    if (filtroEstado === 'inactivos') return 'No hay contratos inactivos'
    if (filtroEstado === 'vencidos') return 'No hay contratos vencidos'
    return 'No hay contratos para mostrar'
  }, [loading, contratos.length, contratosFiltrados.length, filtroEstado, hayFiltrosExtra])

  useEffect(() => {
    if (!actionError) return
    const esErrorAnular =
      actionError === mensajeMovimientos || actionError === mensajeSoloInactivo
    setAlerta({
      open: true,
      titulo: esErrorAnular ? 'No se puede anular' : 'No se pudo finalizar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError, mensajeMovimientos, mensajeSoloInactivo])

  const abrirModal = () => {
    limpiarSubmitError()
    setModalOpen(true)
  }

  const cerrarModal = () => {
    if (!submitting) setModalOpen(false)
  }

  const abrirConfirmFinalizar = (contrato) => {
    limpiarActionError()
    setContratoFinalizando(contrato)
    setConfirmOpen(true)
  }

  const cancelarFinalizar = () => {
    if (!finalizando) {
      setConfirmOpen(false)
      setContratoFinalizando(null)
    }
  }

  const confirmarFinalizar = async () => {
    if (!contratoFinalizando) return

    const idFinalizado = contratoFinalizando.id
    const ok = await finalizar(idFinalizado)
    if (ok) {
      await refetchPropiedades()
      setConfirmOpen(false)
      setContratoFinalizando(null)
      if (contratoDetalleId != null && String(contratoDetalleId) === String(idFinalizado)) {
        cerrarDetalle()
      }
    }
  }

  const abrirConfirmAnular = (contrato) => {
    limpiarActionError()
    setContratoAnulando(contrato)
    setConfirmAnularOpen(true)
  }

  const cancelarAnular = () => {
    if (!anulando) {
      setConfirmAnularOpen(false)
      setContratoAnulando(null)
    }
  }

  const confirmarAnular = async () => {
    if (!contratoAnulando) return

    const ok = await anular(contratoAnulando)
    if (ok) {
      await refetchPropiedades()
      setConfirmAnularOpen(false)
      setContratoAnulando(null)
    }
  }

  const handleCrear = async (form) => {
    const ok = await crear(form)
    if (ok) await refetchPropiedades()
    return ok
  }

  const abrirDetalle = (contrato) => {
    setContratoDetalleId(contrato.id)
  }

  const cerrarDetalle = () => {
    setContratoDetalleId(null)
  }

  const resolverInquilino = (inquilino) => {
    if (!inquilino?.id) return inquilino
    return inquilinos.find((i) => String(i.id) === String(inquilino.id)) ?? inquilino
  }

  const resolverPropiedad = (propiedad) => {
    if (!propiedad?.id) return propiedad
    return propiedades.find((p) => String(p.id) === String(propiedad.id)) ?? propiedad
  }

  const abrirDetalleInquilino = (inquilino) => {
    setInquilinoDetalle(resolverInquilino(inquilino))
    setDetalleInquilinoOpen(true)
  }

  const abrirDetallePropiedad = (propiedad) => {
    setPropiedadDetalle(resolverPropiedad(propiedad))
    setDetallePropiedadOpen(true)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const mensajeConfirmacionFinalizar = mensajeConfirmacionFinalizarContrato(contratoFinalizando)

  const mensajeConfirmacionAnular = contratoAnulando
    ? `¿Anular el contrato inactivo de ${contratoAnulando.inquilinos?.nombre_completo ?? 'este inquilino'} en ${contratoAnulando.propiedades?.direccion ?? 'esta propiedad'}? Solo está permitido si no tiene aumentos confirmados ni reclamos para ese inquilino y propiedad. Los documentos adjuntos se eliminarán junto con el contrato. Esta acción no se puede deshacer.`
    : ''

  return (
    <>
      <AdminListLayout
        title="Contratos de Alquiler"
        subtitle="Gestión de la cartera de alquileres: vigencia, ajustes y ciclo de vida de cada contrato."
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar contratos: {error}</p>
            </Card>
          ) : null
        }
        summary={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ingreso mensual comprometido"
              value={loading ? '…' : formatMontoCompacto(resumen.ingresoMensual)}
              hint="Suma de alquileres de contratos activos"
              icon="chart"
              theme="emerald"
            />
            <StatCard
              label="Contratos activos"
              value={loading ? '…' : resumen.activos}
              hint="Cartera vigente en curso"
              icon="building"
              theme="indigo"
            />
            <StatCard
              label="Por vencer pronto"
              value={loading ? '…' : resumen.porVencer}
              hint={`Vencen dentro de ${VENCE_PRONTO_DIAS} días`}
              icon="calendar"
              theme={resumen.porVencer > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              label="Vencidos"
              value={loading ? '…' : resumen.vencidos}
              hint={resumen.vencidos > 0 ? 'Requieren renovar o finalizar' : 'Sin contratos vencidos'}
              icon="alert"
              theme={resumen.vencidos > 0 ? 'red' : 'emerald'}
            />
          </div>
        }
      >
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 py-3 lg:px-6">
          <div className="relative w-36 shrink-0 lg:w-40">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="busqueda-inquilino"
              type="search"
              value={busquedaInquilino}
              onChange={(e) => setBusquedaInquilino(e.target.value)}
              placeholder="Buscar inquilino..."
              aria-label="Buscar inquilino por nombre"
              className={`${inputToolbarClass} pl-9`}
              disabled={loading}
            />
          </div>

          <select
            id="filtro-tipo-ajuste"
            value={filtroTipoAjuste}
            onChange={(e) => setFiltroTipoAjuste(e.target.value)}
            aria-label="Filtrar por tipo de ajuste"
            className={`${inputToolbarClass} w-32 shrink-0 cursor-pointer pr-8 lg:w-36`}
            disabled={loading}
          >
            {FILTRO_TIPO_AJUSTE.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white p-1"
            role="group"
            aria-label="Filtrar contratos por estado"
          >
            {FILTRO_ESTADO.map(({ value, label }) => {
              const activo = filtroEstado === value
              const count = loading ? '…' : conteosEstado[value]
              const esVencidos = value === 'vencidos'
              return (
                <button
                  key={value}
                  type="button"
                  disabled={loading}
                  onClick={() => setFiltroEstado(value)}
                  className={`inline-flex h-full shrink-0 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors lg:px-2.5 ${
                    activo
                      ? esVencidos
                        ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100'
                        : 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : esVencidos
                        ? 'text-red-600 hover:text-red-800'
                        : 'text-slate-600 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>

          <div className="sticky right-0 ml-auto shrink-0 bg-slate-50/70 pl-2">
            <AdminNuevoButton
              label="NUEVO CONTRATO"
              onClick={abrirModal}
              className="h-10 w-full whitespace-nowrap sm:w-auto"
            />
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Monto</AdminTableHeaderCell>
              <AdminTableHeaderCell>Vigencia</AdminTableHeaderCell>
              <AdminTableHeaderCell>Ajuste</AdminTableHeaderCell>
              <AdminTableHeaderCell>Próx. aumento</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>Cargando contratos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && contratosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>{mensajeListadoVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              contratosPagina.map((c) => (
                <AdminTableRow key={c.id ?? `${c.inquilino_id}-${c.propiedad_id}`}>
                  <AdminTableCell className="font-medium text-slate-900">
                    {c.inquilinos?.nombre_completo ?? '—'}
                  </AdminTableCell>
                  <AdminTableCell>{c.propiedades?.direccion ?? '—'}</AdminTableCell>
                  <AdminTableCell className="tabular-nums">{formatMonto(c.monto_alquiler)}</AdminTableCell>
                  <AdminTableCell className="text-slate-600">
                    {formatVigencia(c.fecha_inicio, c.fecha_fin)}
                  </AdminTableCell>
                  <AdminTableCell className="text-slate-600 text-xs">
                    <span className="block">{TIPO_AJUSTE_LABELS[c.tipo_ajuste] ?? c.tipo_ajuste ?? '—'}</span>
                    <span className="text-slate-400">
                      {periodicidadLabelPorMeses(c.periodicidad_meses)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-slate-600 tabular-nums">
                    {formatFecha(c.fecha_proximo_aumento)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge color={colorEstadoContrato(c)}>
                      {etiquetaEstadoContrato(c)}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableActionsCell>
                    <ContratoRowActions
                      onView={() => abrirDetalle(c)}
                      onFinalize={
                        c.estado === 'programado' || c.estado === 'activo'
                          ? () => abrirConfirmFinalizar(c)
                          : undefined
                      }
                      finalizeLabel={c.estado === 'programado' ? 'Cancelar' : 'Finalizar'}
                      onAnular={
                        c.estado === 'inactivo' ? () => abrirConfirmAnular(c) : undefined
                      }
                    />
                  </AdminTableActionsCell>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>

        <AdminTablePagination
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          totalItems={contratosFiltrados.length}
          itemsPorPagina={FILAS_POR_PAGINA}
          onPaginaChange={setPaginaActual}
        />
      </AdminListLayout>

      <ContratoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleCrear}
        submitting={submitting}
        submitError={submitError}
        inquilinos={inquilinos}
        inquilinosLoading={inquilinosLoading}
        propiedades={propiedades}
        propiedadesLoading={propiedadesLoading}
        contratos={contratos}
      />

      <ContratoDetalleModal
        open={contratoDetalleId != null}
        contratoId={contratoDetalleId}
        onClose={cerrarDetalle}
        onVerInquilino={abrirDetalleInquilino}
        onVerPropiedad={abrirDetallePropiedad}
        onFinalizar={abrirConfirmFinalizar}
      />

      <InquilinoDetalleModal
        open={detalleInquilinoOpen}
        inquilino={inquilinoDetalle}
        onClose={() => {
          setDetalleInquilinoOpen(false)
          setInquilinoDetalle(null)
        }}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadDetalle}
        onClose={() => {
          setDetallePropiedadOpen(false)
          setPropiedadDetalle(null)
        }}
        apilado
      />

      <AdminConfirmModal
        open={confirmOpen}
        title="Finalizar contrato"
        message={mensajeConfirmacionFinalizar}
        confirmLabel={contratoFinalizando?.estado === 'programado' ? 'Cancelar reserva' : 'Finalizar'}
        confirmVariant="warning"
        apilado={contratoDetalleId != null}
        onConfirm={confirmarFinalizar}
        onCancel={cancelarFinalizar}
        loading={finalizando}
      />

      <AdminConfirmModal
        open={confirmAnularOpen}
        title="Anular contrato"
        message={mensajeConfirmacionAnular}
        confirmLabel="Anular"
        onConfirm={confirmarAnular}
        onCancel={cancelarAnular}
        loading={anulando}
      />

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />
    </>
  )
}
