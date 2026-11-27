import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import { MontoTrazable, TrazaAumento } from '../../components/calculo/TrazaCalculo'
import { explicarAumento } from '../../utils/trazabilidadCalculo'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import StatCard from '../../components/admin/StatCard'
import AumentoDetalleModal from '../../components/admin/AumentoDetalleModal'
import AumentoHistorialModal from '../../components/admin/AumentoHistorialModal'
import AumentosHistorialGlobalModal from '../../components/admin/AumentosHistorialGlobalModal'
import AumentoRowActions from '../../components/admin/AumentoRowActions'
import CargaIndicesManuales from '../../components/admin/CargaIndicesManuales'
import IndicesEvolucionModal from '../../components/admin/IndicesEvolucionModal'
import IndiceChip from '../../components/admin/IndiceChip'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
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
import { usePaginacion } from '../../hooks/usePaginacion'
import { useFilasPorPagina } from '../../hooks/useFilasPorPagina'
import { useToast } from '../../contexts/ToastContext'
import { claveRevision, deshacerAumento } from '../../services/aumentosService'
import { listarInquilinos } from '../../services/inquilinosService'
import { listarPropiedades } from '../../services/propiedadesService'
import {
  obtenerComprobanteAumento,
  obtenerUrlDescargaDocumento,
} from '../../services/documentosService'
import {
  formatPorcentaje,
  capitalizar,
  DIA_CORTE_OPERATIVO,
  DIA_INICIO_BANDEJA,
  fechaCorteOperativoIso,
  esAumentoRezagado,
  esPeriodoOperativo,
  etiquetaPeriodoAumento,
  formatFechaAumento,
  formatPeriodoMesAnio,
  hoyIsoLocal,
  interpretarPropuestaAumento,
  requiereCargaManual,
  periodoOperativoInfo,
  propuestaDesdeAumentoRegistrado,
} from '../../utils/aumentosUi'
import { IconCheck, IconClock, IconInfo, IconRefresh } from '../../components/icons/Icons'
import {
  buttonClass,
  calloutClass,
  cn,
  dotTones,
  segmentedInlineClass,
  segmentedItemClass,
} from '../../utils/ui'


function clavePropuestaAumento(p) {
  if (!p) return ''
  const fecha = p.fechaAumento ?? p.fecha_hasta ?? p.fecha_proximo_aumento ?? p.fecha_aplicacion
  return `${p.contrato_id}:${fecha ?? ''}`
}

const COL_CONTRATO = ''
const COL_FECHA = 'w-[9.5rem]'
const COL_MONTO_ACTUAL = 'w-[9rem]'
const COL_MONTO_AJUSTADO = 'w-[10rem]'
const COL_INDICE = 'w-[6rem]'
const COL_CONFIRMADO = 'w-[8.5rem]'

const LEYENDA_ESTADOS = [
  {
    titulo: 'Definitivo',
    tono: 'success',
    texto: 'Valores oficiales de cierre. Permite confirmar y actualizar el contrato.',
  },
  {
    titulo: 'Índice pendiente',
    tono: 'warning',
    texto:
      'Falta un mes o el cierre (por ejemplo IPC de agosto). Igual ves el monto, con advertencia. Puede variar cuando se publique.',
  },
  {
    titulo: 'Carga manual',
    tono: 'warning',
    texto:
      'Solo si Argly no trae ningún dato (API caída). Cargás los valores oficiales a mano y el sistema calcula igual.',
  },
  {
    titulo: 'Proyectado',
    tono: 'brand',
    texto: `Todavía no entró a la bandeja (antes del día ${DIA_INICIO_BANDEJA} de su mes). Solo vista previa.`,
  },
  {
    titulo: 'Sin datos',
    tono: 'neutral',
    texto: 'Argly no respondió. Ahí sí se cargan los índices a mano en el detalle.',
  },
]

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

export default function AdminAumentos() {
  const [refTabla, filasPorPagina] = useFilasPorPagina()
  const toast = useToast()
  const [filtro, setFiltro] = useState('pendientes')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState([])
  const [confirmModo, setConfirmModo] = useState('uno')
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [propuestaDetalle, setPropuestaDetalle] = useState(null)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [propuestaHistorial, setPropuestaHistorial] = useState(null)
  const [historialGlobalOpen, setHistorialGlobalOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [indicesOpen, setIndicesOpen] = useState(false)
  const [deshacerTarget, setDeshacerTarget] = useState(null)
  const [deshaciendo, setDeshaciendo] = useState(false)
  const [reloadHistorialToken, setReloadHistorialToken] = useState(0)
  const [avisoComprobante, setAvisoComprobante] = useState(null)
  const [inquilinos, setInquilinos] = useState([])
  const [propiedades, setPropiedades] = useState([])

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
    aplicarIndicesManuales,
    refrescarIndicesContrato,
    indicesManuales,
    guardarIndice,
    eliminarIndice,
    revisiones,
    guardarRevision,
    limpiarError,
  } = useAumentos()

  // Estado de cada aumento pendiente según el documento: Pendiente → Revisado → Confirmado.
  const revisionDe = useCallback(
    (p) => (p ? (revisiones.get(claveRevision(p.contrato_id, p.fecha_hasta)) ?? null) : null),
    [revisiones]
  )
  const estaRevisado = useCallback((p) => Boolean(revisionDe(p)?.revisado), [revisionDe])

  // Pendiente → Revisado: una vez revisado, el aumento sigue Revisado hasta confirmarlo.
  const marcarRevisado = async (propuesta, datos = {}) => {
    const actual = revisionDe(propuesta)
    if (actual?.revisado) return
    const { error: errorRevision } = await guardarRevision(propuesta, {
      revisado: true,
      observaciones: datos.observaciones ?? actual?.observaciones ?? null,
      montoAjustado: datos.montoAjustado ?? actual?.monto_ajustado ?? null,
    })
    if (!errorRevision) toast.info('Aumento revisado', `${propuesta.inquilino_nombre ?? 'El aumento'} queda listo para confirmar.`)
  }

  /** Aplica el redondeo y las observaciones guardadas en la revisión (confirmación masiva). */
  const conRevision = (p) => {
    const revision = revisionDe(p)
    if (!revision) return p
    const ajustado = Number(revision.monto_ajustado)
    const usaAjuste = Number.isFinite(ajustado) && p.monto_propuesto != null && ajustado >= Number(p.monto_propuesto)
    const variacion =
      usaAjuste && Number(p.monto_actual) > 0 ? Math.round((ajustado / Number(p.monto_actual) - 1) * 10000) / 100 : p.variacion_pct
    return {
      ...p,
      notas: revision.observaciones ?? p.notas ?? null,
      ...(usaAjuste && {
        monto_propuesto: ajustado,
        monto_calculado: Math.round(Number(p.monto_propuesto)),
        variacion_pct: variacion,
        modo: 'manual',
        detalle_calculo: p.detalle_calculo
          ? { ...p.detalle_calculo, monto_nuevo: ajustado, monto_calculado: Math.round(Number(p.monto_propuesto)), variacion_pct: variacion, modo: 'manual' }
          : p.detalle_calculo,
      }),
    }
  }

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

  // Confirmado = ya tiene un aumento registrado para esa fecha.
  const esConfirmado = useCallback((p) => Boolean(p.ya_aplicado), [])

  const esDelPeriodoOperativo = useCallback(
    (p) => esPeriodoOperativo(p.fechaAumento, hoy),
    [hoy]
  )

  // Pendiente de confirmar: del período operativo vigente y todavía sin confirmar.
  const esPendienteConfirmar = useCallback(
    (p) => esDelPeriodoOperativo(p) && !esConfirmado(p),
    [esDelPeriodoOperativo, esConfirmado]
  )

  // Confirmado en el período operativo vigente.
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

  const conteos = useMemo(() => {
    const pendientes = propuestasConUi.filter(esPendienteConfirmar)
    const confirmados = listadoConfirmados
    const clavesPeriodo = new Set()
    for (const p of pendientes) clavesPeriodo.add(`${p.contrato_id}:${p.fechaAumento}`)
    for (const p of confirmados) clavesPeriodo.add(`${p.contrato_id}:${p.fechaAumento}`)

    return {
      enPeriodo: clavesPeriodo.size,
      pendientes: pendientes.length,
      confirmados: confirmados.length,
      rezagados: propuestasConUi.filter(esRezagado).length,
    }
  }, [propuestasConUi, listadoConfirmados, esPendienteConfirmar, esRezagado])

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

  // El detalle muestra siempre la versión recalculada del aumento (por ejemplo, al cargar índices a mano).
  const propuestaDetalleActual = useMemo(() => {
    if (!propuestaDetalle) return null
    const clave = clavePropuestaAumento(propuestaDetalle)
    return propuestasConUi.find((p) => clavePropuestaAumento(p) === clave) ?? propuestaDetalle
  }, [propuestaDetalle, propuestasConUi])

  const {
    pagina: paginaActual,
    totalPaginas,
    visibles: listadoPagina,
    irAPagina: setPaginaActual,
  } = usePaginacion(listadoFiltrado, filasPorPagina, [filtro])

  const listosParaConfirmar = useMemo(
    () => propuestasConUi.filter((p) => p.ui.puedeConfirmar),
    [propuestasConUi]
  )

  const listosRevisados = useMemo(
    () => listosParaConfirmar.filter((p) => estaRevisado(p)),
    [listosParaConfirmar, estaRevisado]
  )

  const indicesNoDisponibles = !loading && !indicesResumen.icl && !indicesResumen.ipc
  const mostrarCargaManual = !loading && requiereCargaManual(propuestas, indicesNoDisponibles)

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

  const abrirConfirm = (lista, modo) => {
    if (!lista.length) return
    setConfirmModo(modo)
    setConfirmTarget(lista)
    setConfirmOpen(true)
  }

  const cerrarConfirm = () => {
    if (confirmando) return
    setConfirmOpen(false)
    setConfirmTarget([])
  }

  const ejecutarConfirm = async () => {
    // Desde el detalle ya llega el monto final; en la confirmación masiva se usa lo guardado al revisar.
    const lista = confirmModo === 'uno' ? confirmTarget : confirmTarget.map(conRevision)
    const { ok, contratoIdsConfirmados } = await confirmarSeleccionados(lista)
    if (ok) {
      const confirmadas = confirmTarget.filter((p) =>
        contratoIdsConfirmados.some((id) => String(id) === String(p.contrato_id))
      )
      if (confirmadas.length === 1) {
        const p = confirmadas[0]
        const fecha = p.fechaAumento ?? p.fecha_hasta ?? p.fecha_proximo_aumento
        toast.success(
          'Aumento confirmado',
          `${p.inquilino_nombre}: el alquiler pasa a ${formatMonto(p.monto_propuesto)} desde el ${formatFechaAumento(fecha)}. Se generó el comprobante y se puede deshacer hasta el ${formatFechaAumento(fechaCorteOperativoIso(fecha))}.`
        )
      } else {
        toast.success(
          `${confirmadas.length} aumentos confirmados`,
          'Cada contrato quedó con su nuevo monto y se generaron los comprobantes.'
        )
      }
      cerrarConfirm()
      cerrarDetalle()
      setFiltro('confirmados')
    }
  }

  const abrirDetalle = (propuesta) => {
    setPropuestaDetalle(propuesta)
    setDetalleOpen(true)
    refrescarIndicesContrato(propuesta.contrato_id)
  }

  const cerrarDetalle = () => {
    if (confirmando) return
    setDetalleOpen(false)
    setPropuestaDetalle(null)
  }

  const confirmarDesdeDetalle = (propuesta) => {
    abrirConfirm([propuesta], 'uno')
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
    const { error: deshacerError, aviso } = await deshacerAumento(deshacerTarget)
    setDeshaciendo(false)

    if (deshacerError) {
      setDeshacerTarget(null)
      setAvisoComprobante(deshacerError.message)
      return
    }

    setDeshacerTarget(null)
    if (aviso) {
      toast.warning('Aumento deshecho', aviso)
    } else {
      toast.success('Aumento deshecho', `El contrato volvió a ${formatMonto(deshacerTarget.monto_anterior)} y se borró el comprobante.`)
    }
    setReloadHistorialToken((n) => n + 1)
    await cargarAumentos()
  }

  const abrirHistorialGlobal = () => setHistorialGlobalOpen(true)
  const cerrarHistorialGlobal = () => setHistorialGlobalOpen(false)

  const mensajeDeshacer = (() => {
    if (!deshacerTarget) return ''
    const monto = formatMonto(deshacerTarget.monto_anterior)
    return `El contrato vuelve a ${monto}, se borra el registro del aumento y su comprobante PDF. Se puede deshacer hasta el ${formatFechaAumento(fechaCorteOperativoIso(deshacerTarget.fecha_aplicacion))} y mientras el período de ese mes no esté pagado. ¿Continuar?`
  })()

  const mensajeConfirm = (() => {
    if (confirmTarget.length === 1) {
      const t = confirmTarget[0]
      const fecha = t.fecha_hasta ?? t.fecha_proximo_aumento
      const nombre = t.inquilino_nombre ?? 'este contrato'
      const monto = formatMonto(t.monto_propuesto)
      return `¿Confirmar el aumento de ${nombre}? El monto pasa a ${monto} desde el ${formatFechaAumento(fecha)} y se genera el comprobante PDF.`
    }
    if (confirmModo === 'todos') {
      return `¿Confirmar ${confirmTarget.length} aumento(s) sin revisión individual? Entran solo los que ya se pueden confirmar. Se fija el monto calculado de cada contrato y se genera su comprobante PDF. El redondeo y la nota no se aplican en este lote.`
    }
    return `¿Confirmar ${confirmTarget.length} aumento(s) marcados como revisados? Se fija el monto calculado de cada contrato y se genera su comprobante PDF.`
  })()

  const tituloConfirm =
    confirmModo === 'todos'
      ? 'Confirmar todos'
      : confirmTarget.length === 1
        ? 'Confirmar aumento'
        : 'Confirmar revisados'

  const handleActualizar = async () => {
    limpiarError()
    const ok = await cargarAumentos()
    if (ok) toast.info('Índices y montos actualizados', 'Se recalcularon los aumentos con los últimos valores publicados.')
  }

  return (
    <>
      <AdminListLayout refTabla={refTabla}
        title="Aumentos"
        subtitle={`Aumentos de ${capitalizar(periodoOperativo.nombre)}: entran a la bandeja el día ${DIA_INICIO_BANDEJA} y se confirman hasta el día ${DIA_CORTE_OPERATIVO} del mes siguiente.`}
        titleAction={
          <button
            type="button"
            onClick={() => setAyudaOpen(true)}
            className={cn(buttonClass({ variant: 'ghost', size: 'iconSm' }), 'text-slate-400 hover:text-brand-600')}
            aria-label="Cómo funciona este módulo"
            title="Cómo funciona este módulo"
          >
            <IconInfo className="h-5 w-5" />
          </button>
        }
        alerts={
          error || indicesNoDisponibles || syncWarning ? (
            <div className="space-y-2">
              {error && <div className={calloutClass('danger')}>{error}</div>}
              {indicesNoDisponibles && !error && (
                <div className={calloutClass('warning')}>
                  <p className="font-medium">Índices no disponibles</p>
                  <p className="mt-0.5">
                    No pudimos obtener ICL/IPC de Argly. Cargá los valores oficiales en Carga manual de índices:
                    se recalculan los aumentos que los usan.
                  </p>
                </div>
              )}
              {syncWarning && !error && <div className={calloutClass('warning')}>{syncWarning}</div>}
            </div>
          ) : null
        }
        summary={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
            <StatCard
              compact
              label={`Aumentos en ${capitalizar(periodoOperativo.nombre)}`}
              value={loading ? '…' : conteos.enPeriodo}
              hint="Contratos con aumento este período"
              icon="calendar"
              theme="slate"
            />
            <StatCard
              compact
              label="Pendientes de revisión"
              value={loading ? '…' : conteos.pendientes}
              hint="Falta revisar y confirmar"
              icon="clipboard"
              theme={!loading && conteos.pendientes > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              compact
              label="Confirmados"
              value={loading ? '…' : conteos.confirmados}
              hint="Ya confirmados este período"
              icon="check"
              theme="emerald"
            />
            <StatCard
              compact
              label="Rezagados"
              value={loading ? '…' : conteos.rezagados}
              hint="No confirmados de otros períodos"
              icon="alert"
              theme={!loading && conteos.rezagados > 0 ? 'red' : 'slate'}
            />
            <StatCard
              compact
              label="Índices"
              value="IPC · ICL"
              hint="Ver evolución"
              icon="chart"
              theme="slate"
              onClick={() => setIndicesOpen(true)}
              ariaLabel="Ver evolución de índices IPC e ICL"
            />
          </div>
        }
      >
        {mostrarCargaManual && (
          <CargaIndicesManuales
            indices={indicesManuales}
            onGuardar={async (entrada) => {
              const resultado = await guardarIndice(entrada)
              if (!resultado.error) toast.success('Índice guardado', 'Se recalcularon los aumentos que dependen de ese valor.')
              return resultado
            }}
            onEliminar={eliminarIndice}
            disabled={loading || confirmando}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-4 py-3 lg:px-5">
          <div
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-inset ring-slate-300"
            aria-label={`Período operativo: ${periodoOperativo.etiqueta}`}
          >
            <span className="text-xs text-slate-500">Período</span>
            <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
              {periodoOperativo.etiqueta}
            </span>
          </div>

          <div
            className={cn(segmentedInlineClass, 'max-w-full shrink-0 overflow-x-auto')}
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
                  className={cn(
                    segmentedItemClass(activo, { fill: false }),
                    'inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50'
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[11px] tabular-nums',
                      value === 'rezagados' && count > 0
                        ? 'font-semibold text-red-700'
                        : activo
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-400'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
            <Button
              variant="secondary"
              icon={IconClock}
              onClick={abrirHistorialGlobal}
              disabled={loading}
              title="Ver historial de todos los aumentos"
            >
              <span className="hidden sm:inline">Historial</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleActualizar}
              disabled={loading || confirmando}
              title="Actualizar índices y montos"
            >
              <IconRefresh className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={2} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              variant="secondary"
              className="flex-1 lg:flex-none"
              onClick={() => abrirConfirm(listosParaConfirmar, 'todos')}
              disabled={loading || confirmando || listosParaConfirmar.length === 0}
              title="Confirma todos los que ya se pueden confirmar, sin exigir la marca de revisado"
            >
              Confirmar todos
              {listosParaConfirmar.length > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums">{listosParaConfirmar.length}</span>
              )}
            </Button>
            <Button
              icon={IconCheck}
              className="flex-1 lg:flex-none"
              onClick={() => abrirConfirm(listosRevisados, 'revisados')}
              disabled={loading || confirmando || listosRevisados.length === 0}
            >
              Confirmar revisados
              {listosRevisados.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{listosRevisados.length}</span>
              )}
            </Button>
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className={`${COL_CONTRATO} align-top`}>
                Contrato
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_FECHA} align-top`}>
                Período de aumento
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_MONTO_ACTUAL} align-top`}>
                <span className="block text-right">Monto actual</span>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_MONTO_AJUSTADO} align-top`}>
                <span className="block text-right">Monto ajustado</span>
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_INDICE} align-top !text-center`}>
                Índice
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={`${COL_CONFIRMADO} align-top !text-center`}>
                Estado
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
                      <span className="block whitespace-nowrap tabular-nums text-slate-600">
                        {formatMonto(p.monto_actual)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO_AJUSTADO} !text-right align-top`}>
                      {ui.montoMostrar == null ? (
                        <div className="flex flex-col items-end text-right">
                          <span className="block whitespace-nowrap tabular-nums text-slate-400">
                            —
                          </span>
                          <span className="whitespace-nowrap text-xs text-slate-400">
                            Sin datos de Argly
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end text-right">
                          <MontoTrazable
                            className="whitespace-nowrap tabular-nums font-semibold text-slate-900"
                            contenido={
                              p.detalle_calculo
                                ? () => (
                                    <TrazaAumento
                                      explicacion={explicarAumento(p.detalle_calculo, { montoFinal: ui.montoMostrar, notas: p.notas })}
                                    />
                                  )
                                : null
                            }
                          >
                            {ui.montoEsAproximado ? '~' : ''}
                            {formatMonto(ui.montoMostrar)}
                          </MontoTrazable>
                          {p.variacion_pct != null && (
                            <span className="text-xs font-medium tabular-nums text-emerald-600">
                              (+{formatPorcentaje(p.variacion_pct)})
                            </span>
                          )}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_INDICE} align-top`}>
                      <div className="flex justify-center">
                        <IndiceChip tipo={p.tipo_ajuste ?? p.indice_tipo} />
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_CONFIRMADO} align-top`}>
                      <div className="flex justify-center">
                        {esConfirmado(p) ? (
                          <Badge tone="success" icon={IconCheck}>
                            Confirmado
                          </Badge>
                        ) : estaRevisado(p) ? (
                          <Badge tone="brand">Revisado</Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
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
          itemsPorPagina={filasPorPagina}
          onPaginaChange={setPaginaActual}
        />
      </AdminListLayout>

      <AumentoDetalleModal
        key={
          detalleOpen && propuestaDetalleActual
            ? `detalle-${propuestaDetalleActual.contrato_id}|${propuestaDetalleActual.fecha_hasta}|${propuestaDetalleActual.monto_propuesto}`
            : 'detalle-cerrado'
        }
        open={detalleOpen}
        propuesta={propuestaDetalleActual}
        inquilinos={inquilinos}
        propiedades={propiedades}
        onClose={cerrarDetalle}
        onConfirmar={confirmarDesdeDetalle}
        onVerHistorial={abrirHistorial}
        onVerComprobante={verComprobante}
        confirmando={confirmando}
        revisado={estaRevisado(propuestaDetalleActual)}
        revision={revisionDe(propuestaDetalleActual)}
        onToggleRevisado={propuestaDetalleActual ? (datos) => marcarRevisado(propuestaDetalleActual, datos) : undefined}
        onGuardarRevision={propuestaDetalleActual ? (datos) => guardarRevision(propuestaDetalleActual, datos) : undefined}
        onSiguiente={irSiguienteARevisar}
        haySiguiente={haySiguienteARevisar}
        onAnterior={irAnteriorARevisar}
        hayAnterior={hayAnteriorARevisar}
        onAplicarIndicesManuales={aplicarIndicesManuales}
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

      <IndicesEvolucionModal key={indicesOpen ? 'indices-abierto' : 'indices-cerrado'} open={indicesOpen} onClose={() => setIndicesOpen(false)} />

      <AdminAlertModal
        open={ayudaOpen}
        variant="info"
        wide
        title="Cómo funciona el módulo de aumentos"
        onClose={() => setAyudaOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="space-y-3">
            <p>
              Cada aumento entra a la bandeja el <span className="font-medium text-slate-800">día {DIA_INICIO_BANDEJA}</span>{' '}
              de su mes y permanece hasta el <span className="font-medium text-slate-800">día {DIA_CORTE_OPERATIVO}</span>{' '}
              del mes siguiente. Ejemplo: un aumento de abril aparece desde el 11 de abril hasta el 10 de mayo. Los
              montos se calculan al ingresar.
            </p>
            <p>
              <span className="font-medium text-slate-800">Estados de un aumento:</span> Pendiente, Revisado (si
              marcás el cálculo como revisado) y Confirmado. Un confirmado se puede deshacer dentro del plazo y vuelve a
              Pendiente. Un pendiente que pasó el plazo de la bandeja se lista como rezagado.
            </p>
            <p>
              <span className="font-medium text-slate-800">Pendientes de confirmar:</span> vista principal del módulo.
              Muestra los aumentos del mes que se está trabajando que todavía no confirmaste. A medida que confirmás, el
              contador baja.
            </p>
            <p>
              <span className="font-medium text-slate-800">Confirmados:</span> aumentos del mes trabajado que ya
              confirmaste. Podés revisar el detalle, el historial o el comprobante, y deshacerlos hasta el día{' '}
              {DIA_CORTE_OPERATIVO} del mes siguiente al mes de aumento.
            </p>
            <p>
              <span className="font-medium text-slate-800">Rezagados:</span> aumentos que no se confirmaron dentro del
              plazo de la bandeja, así que el alquiler quedó sin actualizar. Es lo más urgente: abrí el detalle y
              confirmalos para ponerlos al día.
            </p>
            <p>
              <span className="font-medium text-slate-800">Cálculo:</span> consulta los índices
              oficiales (Argly / INDEC-BCRA) al entrar. No usa datos guardados ni aproximaciones.
              Si faltan índices, se cargan a mano en el detalle.
            </p>
            <p>
              <span className="font-medium text-slate-800">Acciones:</span> desde el detalle confirmás un
              aumento, con redondeo y nota si hace falta. En la bandeja, Confirmar revisados aplica los
              que marcaste; Confirmar todos aplica los que ya se pueden confirmar, sin esa marca. No
              entran los proyectados, los ya confirmados ni los que no tienen un monto válido.
            </p>
          </div>

          <div>
            <p className="font-medium text-slate-900">Origen del monto calculado</p>
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {LEYENDA_ESTADOS.map(({ titulo, texto, tono }) => (
                <li key={titulo} className="flex gap-3 px-3 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotTones[tono]}`} aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{titulo}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
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
