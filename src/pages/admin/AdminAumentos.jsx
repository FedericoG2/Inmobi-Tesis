import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AdminNuevoButton from '../../components/admin/AdminNuevoButton'
import StatCard from '../../components/admin/StatCard'
import AumentoDetalleModal from '../../components/admin/AumentoDetalleModal'
import AumentoHistorialModal from '../../components/admin/AumentoHistorialModal'
import AumentosHistorialGlobalModal from '../../components/admin/AumentosHistorialGlobalModal'
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
import { deshacerAumento } from '../../services/aumentosService'
import { listarInquilinos } from '../../services/inquilinosService'
import { listarPropiedades } from '../../services/propiedadesService'
import {
  obtenerComprobanteAumento,
  obtenerUrlDescargaDocumento,
} from '../../services/documentosService'
import {
  capitalizar,
  chipIndicador,
  DIA_CORTE_OPERATIVO,
  esAumentoRezagado,
  esPeriodoOperativo,
  etiquetaPeriodoAumento,
  formatFechaAumento,
  formatPeriodoIpc,
  formatPeriodoMesAnio,
  formatValorIcl,
  formatValorIpc,
  hoyIsoLocal,
  interpretarPropuestaAumento,
  periodoOperativoInfo,
  propuestaDesdeAumentoRegistrado,
} from '../../utils/aumentosUi'

const FILAS_POR_PAGINA = 4

function clavePropuestaAumento(p) {
  if (!p) return ''
  const fecha = p.fechaAumento ?? p.fecha_hasta ?? p.fecha_proximo_aumento ?? p.fecha_aplicacion
  return `${p.contrato_id}:${fecha ?? ''}`
}

const COL_CONTRATO = 'w-[19rem]'
const COL_FECHA = 'w-[9.5rem]'
const COL_MONTO_ACTUAL = 'w-[13rem]'
const COL_MONTO_AJUSTADO = 'w-[11rem]'
const COL_INDICE = 'w-[6rem]'
const COL_CONFIRMADO = 'w-[7rem]'

const inputToolbarClass =
  'h-10 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50'

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

function IconHistory({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
  const [filtro, setFiltro] = useState('pendientes')
  const [paginaActual, setPaginaActual] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState([])
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [propuestaDetalle, setPropuestaDetalle] = useState(null)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [propuestaHistorial, setPropuestaHistorial] = useState(null)
  const [historialGlobalOpen, setHistorialGlobalOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [revisados, setRevisados] = useState(() => new Set())
  const [deshacerTarget, setDeshacerTarget] = useState(null)
  const [deshaciendo, setDeshaciendo] = useState(false)
  const [reloadHistorialToken, setReloadHistorialToken] = useState(0)
  const [avisoComprobante, setAvisoComprobante] = useState(null)
  const [inquilinos, setInquilinos] = useState([])
  const [propiedades, setPropiedades] = useState([])

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
    confirmadosPeriodo,
    indicesResumen,
    loading,
    confirmando,
    error,
    syncWarning,
    cargarAumentos,
    confirmarSeleccionados,
    limpiarError,
  } = useAumentos()

  useEffect(() => {
    if (!detalleOpen) return

    let cancelado = false

    Promise.all([listarInquilinos(), listarPropiedades()]).then(([inqRes, propRes]) => {
      if (cancelado) return
      if (!inqRes.error) setInquilinos(inqRes.data ?? [])
      if (!propRes.error) setPropiedades(propRes.data ?? [])
    })

    return () => {
      cancelado = true
    }
  }, [detalleOpen])

  const hoy = hoyIsoLocal()
  const periodoOperativo = useMemo(() => periodoOperativoInfo(hoy), [hoy])
  const enVentanaCierre = useMemo(() => {
    const dia = Number(hoy.split('-')[2])
    return dia <= DIA_CORTE_OPERATIVO
  }, [hoy])

  const propuestasConUi = useMemo(
    () =>
      propuestas.map((p) => ({
        ...p,
        ui: interpretarPropuestaAumento(p, hoy),
        fechaAumento: p.fecha_hasta ?? p.fecha_proximo_aumento,
      })),
    [propuestas, hoy]
  )

  const confirmadosPeriodoUi = useMemo(
    () =>
      confirmadosPeriodo.map((row) => {
        const propuesta = propuestaDesdeAumentoRegistrado(row)
        return {
          ...propuesta,
          ui: interpretarPropuestaAumento(propuesta, hoy),
          fechaAumento: row.fecha_aplicacion,
        }
      }),
    [confirmadosPeriodo, hoy]
  )

  // Confirmado = ya tiene un aumento registrado para esa fecha (acordado o aplicado).
  const esConfirmado = useCallback((p) => Boolean(p.ya_acordado || p.ya_aplicado), [])

  const esDelPeriodoOperativo = useCallback(
    (p) => esPeriodoOperativo(p.fechaAumento, hoy),
    [hoy]
  )

  // Pendiente de confirmar: del período operativo vigente y todavía sin confirmar.
  const esPendienteConfirmar = useCallback(
    (p) => esDelPeriodoOperativo(p) && !esConfirmado(p),
    [esDelPeriodoOperativo, esConfirmado]
  )

  // Confirmado en el período operativo vigente (acordado o ya aplicado).
  const esConfirmadoEnPeriodo = useCallback(
    (p) => esDelPeriodoOperativo(p) && esConfirmado(p),
    [esDelPeriodoOperativo, esConfirmado]
  )

  const idsConfirmadosEnHistorial = useMemo(
    () => new Set(confirmadosPeriodoUi.map((p) => `${p.contrato_id}:${p.fechaAumento}`)),
    [confirmadosPeriodoUi]
  )

  const confirmadosPropuestasUi = useMemo(
    () =>
      propuestasConUi.filter(
        (p) =>
          esConfirmadoEnPeriodo(p) &&
          !idsConfirmadosEnHistorial.has(`${p.contrato_id}:${p.fechaAumento}`)
      ),
    [propuestasConUi, esConfirmadoEnPeriodo, idsConfirmadosEnHistorial]
  )

  const listadoConfirmados = useMemo(() => {
    const clave = (p) => `${p.contrato_id}:${p.fechaAumento}`
    const vistos = new Set()
    const merged = []

    for (const p of [...confirmadosPeriodoUi, ...confirmadosPropuestasUi]) {
      const id = clave(p)
      if (vistos.has(id)) continue
      vistos.add(id)
      merged.push(p)
    }

    return merged.sort((a, b) => String(b.fechaAumento).localeCompare(String(a.fechaAumento)))
  }, [confirmadosPeriodoUi, confirmadosPropuestasUi])

  // Rezagado: pasó el día 10 del mes del aumento y nunca se confirmó.
  const esRezagado = useCallback(
    (p) => esAumentoRezagado(p.fechaAumento, esConfirmado(p), hoy),
    [hoy, esConfirmado]
  )

  const FILTRO_AUMENTOS = useMemo(
    () => [
      { value: 'pendientes', label: 'Pendientes de confirmar' },
      { value: 'confirmados', label: 'Confirmados' },
      { value: 'rezagados', label: 'Rezagados' },
    ],
    []
  )

  const conteos = useMemo(
    () => ({
      enPeriodo: propuestasConUi.filter(esDelPeriodoOperativo).length,
      pendientes: propuestasConUi.filter(esPendienteConfirmar).length,
      confirmados: listadoConfirmados.length,
      rezagados: propuestasConUi.filter(esRezagado).length,
    }),
    [propuestasConUi, listadoConfirmados.length, esDelPeriodoOperativo, esPendienteConfirmar, esRezagado]
  )

  const listadoFiltrado = useMemo(() => {
    if (filtro === 'confirmados') return listadoConfirmados
    if (filtro === 'rezagados') return propuestasConUi.filter(esRezagado)
    return propuestasConUi.filter(esPendienteConfirmar)
  }, [propuestasConUi, filtro, listadoConfirmados, esRezagado, esPendienteConfirmar])

  const indiceDetalleEnListado = useMemo(() => {
    if (!propuestaDetalle) return -1
    const claveActual = clavePropuestaAumento(propuestaDetalle)
    return listadoFiltrado.findIndex((p) => clavePropuestaAumento(p) === claveActual)
  }, [propuestaDetalle, listadoFiltrado])

  const haySiguienteARevisar =
    indiceDetalleEnListado >= 0 && indiceDetalleEnListado < listadoFiltrado.length - 1

  const hayAnteriorARevisar = indiceDetalleEnListado > 0

  const irSiguienteARevisar = useCallback(() => {
    if (!haySiguienteARevisar) return
    setPropuestaDetalle(listadoFiltrado[indiceDetalleEnListado + 1])
  }, [haySiguienteARevisar, listadoFiltrado, indiceDetalleEnListado])

  const irAnteriorARevisar = useCallback(() => {
    if (!hayAnteriorARevisar) return
    setPropuestaDetalle(listadoFiltrado[indiceDetalleEnListado - 1])
  }, [hayAnteriorARevisar, listadoFiltrado, indiceDetalleEnListado])

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

  const rezagados = useMemo(
    () => propuestasConUi.filter(esRezagado),
    [propuestasConUi, esRezagado]
  )

  const pendientesConfirmar = useMemo(
    () => propuestasConUi.filter(esPendienteConfirmar),
    [propuestasConUi, esPendienteConfirmar]
  )

  const indicesNoDisponibles = !loading && !indicesResumen.icl && !indicesResumen.ipc

  const mensajeVacio = useMemo(() => {
    if (loading) return 'Calculando aumentos…'
    if (filtro === 'pendientes')
      return `No quedan aumentos sin confirmar en ${capitalizar(periodoOperativo.nombre)}. ¡Todo al día!`
    if (filtro === 'confirmados')
      return `Todavía no hay aumentos confirmados en ${capitalizar(periodoOperativo.nombre)}.`
    if (filtro === 'rezagados')
      return 'No hay aumentos rezagados. ¡Todo al día!'
    if (propuestasConUi.length === 0) {
      return 'No hay contratos con aumento programado para el período operativo'
    }
    return 'Sin contratos para mostrar'
  }, [loading, propuestasConUi.length, filtro, periodoOperativo])

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
      setFiltro('confirmados')
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

  const abrirHistorial = (propuesta) => {
    setPropuestaHistorial(propuesta)
    setHistorialOpen(true)
  }

  const cerrarHistorial = () => {
    setHistorialOpen(false)
    setPropuestaHistorial(null)
  }

  const verComprobante = async (registro) => {
    if (!registro) return
    // Acepta un aumento del historial (con id) o una propuesta de la grilla.
    const aumentoId = registro.id ?? null
    const contratoId = registro.contrato_id
    const fechaAplicacion =
      registro.fecha_aplicacion ?? registro.fecha_hasta ?? registro.fecha_proximo_aumento

    // Abrimos la pestaña de forma síncrona para evitar el bloqueo de pop-ups.
    const ventana = typeof window !== 'undefined' ? window.open('', '_blank') : null

    const { data: documento } = await obtenerComprobanteAumento({
      aumentoId,
      contratoId,
      fechaAplicacion,
    })

    if (!documento?.url_archivo) {
      ventana?.close()
      setAvisoComprobante(
        'No encontramos un comprobante para este aumento. Puede que se haya generado con una versión anterior o que no se haya podido crear al confirmarlo.'
      )
      return
    }

    const { data: urlData, error: urlError } = await obtenerUrlDescargaDocumento(
      documento.url_archivo
    )

    if (urlError || !urlData?.signedUrl) {
      ventana?.close()
      setAvisoComprobante('No pudimos abrir el comprobante en este momento. Intentá de nuevo.')
      return
    }

    if (ventana) ventana.location = urlData.signedUrl
    else window.open(urlData.signedUrl, '_blank', 'noopener')
  }

  const solicitarDeshacer = (aumento) => {
    setDeshacerTarget(aumento)
  }

  const cancelarDeshacer = () => {
    if (deshaciendo) return
    setDeshacerTarget(null)
  }

  const confirmarDeshacer = async () => {
    if (!deshacerTarget) return
    setDeshaciendo(true)
    const { error: deshacerError } = await deshacerAumento(deshacerTarget)
    setDeshaciendo(false)

    if (deshacerError) {
      setDeshacerTarget(null)
      setAvisoComprobante(deshacerError.message)
      return
    }

    setDeshacerTarget(null)
    setReloadHistorialToken((n) => n + 1)
    await cargarAumentos()
  }

  const abrirHistorialGlobal = () => setHistorialGlobalOpen(true)
  const cerrarHistorialGlobal = () => setHistorialGlobalOpen(false)

  const mensajeDeshacer = (() => {
    if (!deshacerTarget) return ''
    const monto = formatMonto(deshacerTarget.monto_anterior)
    if (deshacerTarget.aplicado) {
      return `Esto revierte el aumento ya aplicado: el alquiler vuelve a ${monto} y se elimina el registro y su comprobante. Solo se puede deshacer el aumento más reciente del contrato. ¿Continuar?`
    }
    return `Esto cancela el aumento acordado a futuro y elimina su comprobante. El contrato no se modifica. ¿Continuar?`
  })()

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

  const tituloConfirm =
    confirmTarget.length === 1 ? 'Confirmar Aumento' : 'Confirmar Aumentos'

  const handleActualizar = () => {
    limpiarError()
    setRevisados(new Set())
    cargarAumentos()
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
        subtitle={`Período operativo: ${capitalizar(periodoOperativo.nombre)}. Ventana de confirmación hasta el día ${DIA_CORTE_OPERATIVO} de cada mes.`}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label={`Contratos que aumentan en ${capitalizar(periodoOperativo.nombre)}`}
              value={loading ? '…' : conteos.enPeriodo}
              hint={
                enVentanaCierre
                  ? `Cierre del mes · hasta el día ${DIA_CORTE_OPERATIVO}`
                  : `Período operativo · ${periodoOperativo.etiqueta}`
              }
              icon="calendar"
              theme="indigo"
            />
            <StatCard
              label={`Aumentos pendientes de ${capitalizar(periodoOperativo.nombre)} sin confirmar`}
              value={loading ? '…' : pendientesConfirmar.length}
              hint={
                pendientesConfirmar.length > 0
                  ? enVentanaCierre
                    ? `Confirmar antes del día ${DIA_CORTE_OPERATIVO}`
                    : `Período operativo · ${periodoOperativo.etiqueta}`
                  : `Todo confirmado en ${capitalizar(periodoOperativo.nombre)}`
              }
              icon="clipboard"
              theme={pendientesConfirmar.length > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              label="Aumentos rezagados sin confirmar"
              value={loading ? '…' : rezagados.length}
              hint={
                rezagados.length > 0
                  ? `Pasaron el día ${DIA_CORTE_OPERATIVO} sin confirmar · ¡revisar!`
                  : 'Sin rezagados'
              }
              icon="alert"
              theme={rezagados.length > 0 ? 'red' : 'emerald'}
            />
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
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3"
            aria-label={`Período operativo: ${periodoOperativo.etiqueta}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
              Período operativo
            </span>
            <span className="whitespace-nowrap text-sm font-semibold text-brand-900">
              {periodoOperativo.etiqueta}
            </span>
          </div>

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
                      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100'
                      : 'text-slate-600 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>

          <div className="sticky right-0 ml-auto flex shrink-0 items-center gap-2 bg-slate-50/70 pl-2">
            <button
              type="button"
              onClick={abrirHistorialGlobal}
              disabled={loading}
              className={`${inputToolbarClass} inline-flex items-center gap-2 px-3`}
              title="Ver historial de todos los aumentos"
            >
              <IconHistory className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
            </button>
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
              <AdminTableHeaderCell className={`${COL_CONTRATO} align-top`}>
                Contrato
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_FECHA} align-top`}>
                Periodo de aumento
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_MONTO_ACTUAL} align-top`}>
                <span className="block text-right text-brand-700">Monto actual de alquiler</span>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_MONTO_AJUSTADO} align-top`}>
                <span className="block text-right">Monto ajustado</span>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_INDICE} align-top !text-center`}>
                Índice
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_CONFIRMADO} align-top !text-center`}>
                Confirmado
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
                const indice = chipIndicador(p.tipo_ajuste ?? p.indice_tipo)

                return (
                  <AdminTableRow key={p.aumento_id ? `aumento-${p.aumento_id}` : p.contrato_id}>
                    <AdminTableCell className="min-w-0 align-top">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-900">
                          {p.inquilino_nombre ?? '—'}
                        </span>
                        <span
                          className="truncate text-xs text-slate-500"
                          title={p.propiedad_direccion ?? undefined}
                        >
                          {p.propiedad_direccion ?? '—'}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_FECHA} align-top`}>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-900">
                          {formatPeriodoMesAnio(p.fechaAumento)}
                        </span>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {etiquetaPeriodoAumento(p.fechaAumento, hoy)}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO_ACTUAL} !text-right align-top`}>
                      <span className="block whitespace-nowrap tabular-nums font-medium text-brand-700">
                        {formatMonto(p.monto_actual)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO_AJUSTADO} !text-right align-top`}>
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
                          <span className="whitespace-nowrap tabular-nums font-semibold text-slate-900">
                            {ui.montoEsAproximado ? '~' : ''}
                            {formatMonto(ui.montoMostrar)}
                          </span>
                          {p.variacion_pct != null && (
                            <span className="text-xs font-medium tabular-nums text-emerald-600">
                              (+{p.variacion_pct}%)
                            </span>
                          )}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_INDICE} align-top`}>
                      <div className="flex justify-center">
                        <span
                          title={indice.tooltip ?? undefined}
                          className="inline-flex cursor-help items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          <span className="text-sm leading-none">{indice.icon}</span>
                          {indice.label}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_CONFIRMADO} align-top`}>
                      <div className="flex justify-center">
                        {esConfirmado(p) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                            No
                          </span>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableActionsCell>
                      <AumentoRowActions
                        onView={() => abrirDetalle(p)}
                        onHistory={() => abrirHistorial(p)}
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
        inquilinos={inquilinos}
        propiedades={propiedades}
        onClose={cerrarDetalle}
        onConfirmar={confirmarDesdeDetalle}
        onVerHistorial={abrirHistorial}
        onVerComprobante={verComprobante}
        confirmando={confirmando}
        revisado={propuestaDetalle ? revisados.has(propuestaDetalle.contrato_id) : false}
        onToggleRevisado={
          propuestaDetalle ? () => toggleRevisado(propuestaDetalle.contrato_id) : undefined
        }
        onSiguiente={irSiguienteARevisar}
        haySiguiente={haySiguienteARevisar}
        onAnterior={irAnteriorARevisar}
        hayAnterior={hayAnteriorARevisar}
      />

      <AumentoHistorialModal
        open={historialOpen}
        propuesta={propuestaHistorial}
        onClose={cerrarHistorial}
        onVerComprobante={verComprobante}
        onDeshacer={solicitarDeshacer}
        accionDeshabilitada={deshaciendo}
        reloadToken={reloadHistorialToken}
      />

      <AumentosHistorialGlobalModal
        open={historialGlobalOpen}
        onClose={cerrarHistorialGlobal}
        onVerComprobante={verComprobante}
        onDeshacer={solicitarDeshacer}
        accionDeshabilitada={deshaciendo}
        reloadToken={reloadHistorialToken}
      />

      <AdminAlertModal
        open={ayudaOpen}
        variant="info"
        wide
        title="Aumentos de Alquiler (por período)"
        onClose={() => setAyudaOpen(false)}
      >
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="space-y-3">
            <p>
              El foco del módulo sigue el <span className="font-medium text-slate-800">período operativo</span> (arriba a
              la izquierda): del día 1 al {DIA_CORTE_OPERATIVO} confirmás los aumentos del mes en curso; a partir del día{' '}
              {DIA_CORTE_OPERATIVO + 1} el foco pasa al mes siguiente. Los montos se calculan al ingresar.
            </p>
            <p>
              <span className="font-medium text-slate-800">Pendientes de confirmar:</span> vista principal del módulo.
              Muestra solo los del período operativo que todavía no confirmaste. A medida que confirmás, el contador baja.
              Los acordados por adelantado se aplican solos en su fecha.
            </p>
            <p>
              <span className="font-medium text-slate-800">Confirmados:</span> aumentos del período operativo que ya
              acordaste o aplicaste, aunque el contrato ya haya pasado al próximo ciclo. Podés revisar el detalle, el
              historial o el comprobante desde ahí.
            </p>
            <p>
              <span className="font-medium text-slate-800">Rezagados:</span> aumentos cuyo mes ya pasó el día{' '}
              {DIA_CORTE_OPERATIVO} sin confirmarse, así que el alquiler quedó sin actualizar. Es lo más urgente: abrí
              el detalle y confirmalos para ponerlos al día.
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
              <div className="rounded-lg border border-brand-100 bg-brand-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-brand-800">Proyectado</p>
                <p className="mt-0.5 text-xs leading-snug text-brand-900/80">
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
        title={tituloConfirm}
        message={mensajeConfirm}
        confirmLabel="Confirmar aumento"
        confirmVariant="important"
        apilado={detalleOpen}
        loading={confirmando}
        onCancel={cerrarConfirm}
        onConfirm={ejecutarConfirm}
      />

      <AdminConfirmModal
        open={Boolean(deshacerTarget)}
        apilado
        title="Deshacer aumento"
        message={mensajeDeshacer}
        confirmLabel="Deshacer"
        confirmVariant="danger"
        loading={deshaciendo}
        onCancel={cancelarDeshacer}
        onConfirm={confirmarDeshacer}
      />

      <AdminAlertModal
        open={Boolean(avisoComprobante)}
        apilado
        variant="info"
        title="Comprobante"
        message={avisoComprobante}
        onClose={() => setAvisoComprobante(null)}
      />
    </>
  )
}
