import { useEffect, useMemo, useState } from 'react'
import { Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import StatCard from '../../components/admin/StatCard'
import AumentoDetalleModal from '../../components/admin/AumentoDetalleModal'
import AumentoRowActions from '../../components/admin/AumentoRowActions'
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
import { useAumentos } from '../../hooks/useAumentos'
import {
  badgeIndicador,
  etiquetaFechaAumento,
  formatFechaAumento,
  formatPeriodoIpc,
  formatValorIcl,
  formatValorIpc,
  hoyIsoLocal,
  interpretarPropuestaAumento,
} from '../../utils/aumentosUi'

const DIAS_VENTANA = 30
const FILAS_POR_PAGINA = 4

const COL_INQUILINO = 'w-[10.5rem]'
const COL_FECHA = 'w-[7.25rem]'
const COL_MONTO_ACTUAL = 'w-[9rem]'
const COL_MONTO_AJUSTADO = 'w-[10rem]'
const COL_INDICE = 'w-[5.25rem]'

const FILTRO_AUMENTOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'listos', label: 'Listos para confirmar' },
  { value: 'proximos', label: 'Próximos' },
  { value: 'pendientes', label: 'Pendientes' },
]

const inputToolbarClass =
  'h-10 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

function IconRefresh({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  )
}

function IconInfo({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    </svg>
  )
}

export default function AdminAumentos() {
  const [filtro, setFiltro] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState([])
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [propuestaDetalle, setPropuestaDetalle] = useState(null)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [revisados, setRevisados] = useState(() => new Set())

  const toggleRevisado = (contratoId) => {
    setRevisados((prev) => {
      const next = new Set(prev)
      if (next.has(contratoId)) next.delete(contratoId)
      else next.add(contratoId)
      return next
    })
  }

  const {
    propuestas,
    meta,
    indicesResumen,
    loading,
    confirmando,
    error,
    syncWarning,
    cargarAumentos,
    confirmarSeleccionados,
    limpiarError,
  } = useAumentos()

  const hoy = hoyIsoLocal()

  const propuestasConUi = useMemo(
    () =>
      propuestas.map((p) => ({
        ...p,
        ui: interpretarPropuestaAumento(p, hoy),
        fechaAumento: p.fecha_hasta ?? p.fecha_proximo_aumento,
      })),
    [propuestas, hoy]
  )

  const conteos = useMemo(() => {
    const listos = propuestasConUi.filter((p) => p.ui.puedeConfirmar).length
    const proximos = propuestasConUi.filter((p) => p.fechaAumento > hoy).length
    const pendientes = propuestasConUi.filter(
      (p) => p.fechaAumento <= hoy && !p.ui.puedeConfirmar && p.ui.etiqueta !== 'sin_indices'
    ).length
    return {
      todos: propuestasConUi.length,
      listos,
      proximos,
      pendientes,
    }
  }, [propuestasConUi, hoy])

  const listadoFiltrado = useMemo(() => {
    if (filtro === 'listos') return propuestasConUi.filter((p) => p.ui.puedeConfirmar)
    if (filtro === 'proximos') return propuestasConUi.filter((p) => p.fechaAumento > hoy)
    if (filtro === 'pendientes') {
      return propuestasConUi.filter(
        (p) => p.fechaAumento <= hoy && !p.ui.puedeConfirmar && p.ui.etiqueta !== 'sin_indices'
      )
    }
    return propuestasConUi
  }, [propuestasConUi, filtro, hoy])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtro])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(listadoFiltrado.length / FILAS_POR_PAGINA)),
    [listadoFiltrado.length]
  )

  const listadoPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
    return listadoFiltrado.slice(inicio, inicio + FILAS_POR_PAGINA)
  }, [listadoFiltrado, paginaActual])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const listosParaConfirmar = useMemo(
    () => propuestasConUi.filter((p) => p.ui.puedeConfirmar),
    [propuestasConUi]
  )

  const listosRevisados = useMemo(
    () => listosParaConfirmar.filter((p) => revisados.has(p.contrato_id)),
    [listosParaConfirmar, revisados]
  )

  const vencidosSinConfirmar = useMemo(
    () => propuestasConUi.filter((p) => p.fechaAumento < hoy && !p.ya_acordado),
    [propuestasConUi, hoy]
  )

  const indicesNoDisponibles = !loading && !indicesResumen.icl && !indicesResumen.ipc

  const mensajeVacio = useMemo(() => {
    if (loading) return 'Calculando aumentos…'
    if (propuestasConUi.length === 0) {
      return `No hay contratos con aumento en los próximos ${DIAS_VENTANA} días`
    }
    if (filtro === 'listos') return 'Ningún aumento listo para confirmar con este filtro'
    if (filtro === 'proximos') return 'No hay aumentos con fecha futura en la ventana'
    if (filtro === 'pendientes') return 'No hay aumentos pendientes sin confirmar'
    return 'Sin contratos para mostrar'
  }, [loading, propuestasConUi.length, filtro])

  const abrirConfirm = (lista) => {
    if (!lista.length) return
    setConfirmTarget(lista)
    setConfirmOpen(true)
  }

  const cerrarConfirm = () => {
    if (confirmando) return
    setConfirmOpen(false)
    setConfirmTarget([])
  }

  const ejecutarConfirm = async () => {
    const { ok } = await confirmarSeleccionados(confirmTarget)
    if (ok) {
      cerrarConfirm()
      cerrarDetalle()
    }
  }

  const abrirDetalle = (propuesta) => {
    setPropuestaDetalle(propuesta)
    setDetalleOpen(true)
  }

  const cerrarDetalle = () => {
    if (confirmando) return
    setDetalleOpen(false)
    setPropuestaDetalle(null)
  }

  const confirmarDesdeDetalle = (propuesta) => {
    abrirConfirm([propuesta])
  }

  const mensajeConfirm = (() => {
    if (confirmTarget.length === 1) {
      const t = confirmTarget[0]
      const fecha = t.fecha_hasta ?? t.fecha_proximo_aumento
      const nombre = t.inquilino_nombre ?? 'este contrato'
      const monto = formatMonto(t.monto_propuesto)
      if (fecha && fecha > hoy) {
        return `¿Acordar el aumento de ${nombre}? Quedará registrado en ${monto} y se aplicará automáticamente el ${formatFechaAumento(fecha)}.`
      }
      return `¿Confirmar el aumento de ${nombre}? El monto pasará a ${monto}.`
    }
    return `¿Confirmar ${confirmTarget.length} aumento(s)? Los que ya vencieron se aplican ahora; los anticipados quedan acordados para su fecha. Queda registro en el historial.`
  })()

  const handleActualizar = () => {
    limpiarError()
    setRevisados(new Set())
    cargarAumentos({ diasProximos: DIAS_VENTANA })
  }

  const indicadoresIndices = useMemo(() => {
    const icl = indicesResumen.icl
    const ipc = indicesResumen.ipc

    return {
      icl: {
        value: loading ? '…' : formatValorIcl(icl?.valor),
        label: 'Último ICL disponible',
        hint: icl ? `Fuente Argly · al ${formatFechaAumento(icl.fecha)}` : 'Sin datos en Argly',
      },
      ipc: {
        value: loading ? '…' : formatValorIpc(ipc?.valor),
        label: 'Último IPC disponible',
        hint: ipc
          ? `Fuente Argly · ${formatPeriodoIpc(ipc.anio, ipc.mes)}`
          : 'Sin datos en Argly',
      },
    }
  }, [indicesResumen, loading])

  return (
    <>
      <AdminListLayout
        title="Aumentos de Alquiler"
        subtitle={`Ajustes programados en los próximos ${DIAS_VENTANA} días o menos. Los montos se calculan al ingresar.`}
        titleAction={
          <button
            type="button"
            onClick={() => setAyudaOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
            aria-label="Cómo funciona este módulo"
            title="Cómo funciona este módulo"
          >
            <IconInfo />
          </button>
        }
        summary={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label={indicadoresIndices.icl.label}
              value={indicadoresIndices.icl.value}
              hint={indicadoresIndices.icl.hint}
              icon="chart"
              theme="slate"
            />
            <StatCard
              label={indicadoresIndices.ipc.label}
              value={indicadoresIndices.ipc.value}
              hint={indicadoresIndices.ipc.hint}
              icon="chart"
              theme="violet"
            />
          </div>
        }
        alerts={
          <>
            {vencidosSinConfirmar.length > 0 && !loading && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm font-semibold text-red-800">
                  {vencidosSinConfirmar.length} aumento{vencidosSinConfirmar.length > 1 ? 's' : ''}{' '}
                  vencido{vencidosSinConfirmar.length > 1 ? 's' : ''} sin confirmar
                </p>
                <p className="mt-0.5 text-xs text-red-700/90">
                  Ya pasó la fecha del ajuste. Revisá el cálculo y confirmá para no atrasar el alquiler.
                </p>
              </Card>
            )}
            {error && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">{error}</p>
              </Card>
            )}
            {indicesNoDisponibles && !error && (
              <Card className="border border-amber-200 bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">Índices no disponibles</p>
                <p className="mt-0.5 text-xs text-amber-700/90">
                  No pudimos obtener los índices en este momento. Intentá nuevamente más tarde.
                </p>
              </Card>
            )}
            {syncWarning && !error && (
              <Card className="border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-800">{syncWarning}</p>
              </Card>
            )}
          </>
        }
      >
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 py-3 lg:px-6">
          <div
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white p-1"
            role="group"
            aria-label="Filtrar aumentos"
          >
            {FILTRO_AUMENTOS.map(({ value, label }) => {
              const activo = filtro === value
              const count = loading ? '…' : conteos[value]
              return (
                <button
                  key={value}
                  type="button"
                  disabled={loading}
                  onClick={() => setFiltro(value)}
                  className={`inline-flex h-full shrink-0 items-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors lg:px-3 ${
                    activo
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>

          {meta && !loading && (
            <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
              Actualizado al {formatFechaAumento(meta.fecha_calculo)}
            </span>
          )}

          <div className="sticky right-0 ml-auto flex shrink-0 items-center gap-2 bg-slate-50/70 pl-2">
            <button
              type="button"
              onClick={handleActualizar}
              disabled={loading || confirmando}
              className={`${inputToolbarClass} inline-flex items-center gap-2 px-3`}
              title="Actualizar índices y montos"
            >
              <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <AdminNuevoButton
              label={
                listosRevisados.length > 0
                  ? `CONFIRMAR REVISADOS (${listosRevisados.length})`
                  : 'CONFIRMAR REVISADOS'
              }
              onClick={() => abrirConfirm(listosRevisados)}
              variant="primary"
              className="!h-10 whitespace-nowrap"
              disabled={loading || confirmando || listosRevisados.length === 0}
            />
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className={COL_INQUILINO}>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell className="min-w-0">Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_FECHA}>Fecha</AdminTableHeaderCell>
              <AdminTableHeaderCell
                className={`${COL_MONTO_ACTUAL} !text-right text-indigo-700`}
              >
                Monto actual
              </AdminTableHeaderCell>
              <AdminTableHeaderCell
                className={`${COL_MONTO_AJUSTADO} !text-right text-emerald-700`}
              >
                Monto Ajustado
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_INDICE} !text-center`}>
                Índice
              </AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>Calculando aumentos…</AdminTableEmptyCell>
              </AdminTableRow>
            ) : listadoFiltrado.length === 0 ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>{mensajeVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            ) : (
              listadoPagina.map((p) => {
                const { ui } = p
                const indicador = badgeIndicador(p.tipo_ajuste ?? p.indice_tipo)

                return (
                  <AdminTableRow key={p.contrato_id}>
                    <AdminTableCell className={`${COL_INQUILINO} font-medium text-slate-900`}>
                      {p.inquilino_nombre ?? '—'}
                    </AdminTableCell>
                    <AdminTableCell
                      className="min-w-0 truncate text-slate-600"
                      title={p.propiedad_direccion ?? undefined}
                    >
                      {p.propiedad_direccion ?? '—'}
                    </AdminTableCell>
                    <AdminTableCell className={COL_FECHA}>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap text-sm text-slate-900">
                          {formatFechaAumento(p.fechaAumento)}
                        </span>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {etiquetaFechaAumento(p.fechaAumento, hoy)}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO_ACTUAL} !text-right`}>
                      <span className="block whitespace-nowrap tabular-nums font-medium text-indigo-700">
                        {formatMonto(p.monto_actual)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO_AJUSTADO} !text-right`}>
                      {ui.montoMostrar == null ? (
                        <div className="flex flex-col items-end text-right">
                          <span className="block whitespace-nowrap tabular-nums text-slate-400">
                            —
                          </span>
                          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                            Sin índices disponibles
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end text-right">
                          <span className="whitespace-nowrap tabular-nums font-semibold text-emerald-700">
                            {ui.montoEsAproximado ? '~' : ''}
                            {formatMonto(ui.montoMostrar)}
                          </span>
                          {p.variacion_pct != null && (
                            <span className="text-xs font-medium tabular-nums text-emerald-600/90">
                              (+{p.variacion_pct}%)
                            </span>
                          )}
                          {ui.etiqueta === 'acordado' && (
                            <span
                              title={ui.observacion}
                              className="whitespace-nowrap text-[11px] font-medium text-sky-600"
                            >
                              Acordado · aplica {formatFechaAumento(p.fechaAumento)}
                            </span>
                          )}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_INDICE} !text-center`}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${indicador.className}`}
                      >
                        {indicador.label}
                      </span>
                    </AdminTableCell>
                    <AdminTableActionsCell>
                      <AumentoRowActions
                        onView={() => abrirDetalle(p)}
                        disabled={loading || confirmando}
                      />
                    </AdminTableActionsCell>
                  </AdminTableRow>
                )
              })
            )}
          </AdminTableBody>
        </AdminTable>

        <AdminTablePagination
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          totalItems={listadoFiltrado.length}
          itemsPorPagina={FILAS_POR_PAGINA}
          onPaginaChange={setPaginaActual}
        />
      </AdminListLayout>

      <AumentoDetalleModal
        open={detalleOpen}
        propuesta={propuestaDetalle}
        onClose={cerrarDetalle}
        onConfirmar={confirmarDesdeDetalle}
        confirmando={confirmando}
        revisado={propuestaDetalle ? revisados.has(propuestaDetalle.contrato_id) : false}
        onToggleRevisado={
          propuestaDetalle ? () => toggleRevisado(propuestaDetalle.contrato_id) : undefined
        }
      />

      <AdminAlertModal
        open={ayudaOpen}
        variant="info"
        wide
        title={`Aumentos de Alquiler (Próximos ${DIAS_VENTANA} días)`}
        onClose={() => setAyudaOpen(false)}
      >
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="space-y-3">
            <p>
              Despliega automáticamente los contratos con ajuste programado en los próximos{' '}
              {DIAS_VENTANA} días o menos. Los montos se calculan al ingresar.
            </p>
            <p>
              <span className="font-medium text-slate-800">Cálculo:</span> usa los últimos valores
              oficiales de ICL e IPC publicados.
            </p>
            <p>
              <span className="font-medium text-slate-800">Acciones:</span> tocá el ícono del ojo para
              abrir el detalle. Ahí ves el desglose y la fórmula, marcás &quot;Cálculo revisado&quot;
              y confirmás el aumento.
            </p>
            <p>
              <span className="font-medium text-slate-800">Anticipado:</span> podés acordar un aumento
              antes de su fecha. El alquiler vigente no cambia hasta ese día; se aplica solo cuando
              llega la fecha.
            </p>
          </div>

          <div>
            <p className="font-medium text-slate-800">Monto Ajustado — estados</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-emerald-800">Definitivo</p>
                <p className="mt-0.5 text-xs leading-snug text-emerald-900/80">
                  Valores oficiales de cierre. Permite confirmar y actualizar el contrato.
                </p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800">Provisorio</p>
                <p className="mt-0.5 text-xs leading-snug text-amber-900/80">
                  El índice del período aún no se publicó. Se puede confirmar igual (como la
                  calculadora); el monto queda fijo.
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-sky-800">Acordado</p>
                <p className="mt-0.5 text-xs leading-snug text-sky-900/80">
                  Aumento confirmado por adelantado. El monto queda fijo y se aplica solo el día de
                  la fecha.
                </p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-indigo-800">Proyectado</p>
                <p className="mt-0.5 text-xs leading-snug text-indigo-900/80">
                  Estimación sin índices definitivos. Solo vista previa.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">Sin Índices</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  Sin datos para calcular. Requiere revisión manual.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminAlertModal>

      <AdminConfirmModal
        open={confirmOpen}
        title="Confirmar aumentos"
        message={mensajeConfirm}
        confirmLabel="Confirmar"
        confirmVariant="primary"
        loading={confirmando}
        onCancel={cerrarConfirm}
        onConfirm={ejecutarConfirm}
      />
    </>
  )
}
