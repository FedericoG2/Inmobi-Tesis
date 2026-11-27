import { useCallback, useEffect, useState } from 'react'
import {
  calcularAumentosPendientes,
  claveRevision,
  confirmarAumentos,
  ejecutarMantenimientoContratos,
  generarComprobantesAumentos,
  guardarRevisionAumento,
  listarAumentosConfirmadosEnPeriodo,
  listarRevisionesAumento,
  recalcularPropuestasConOverrides,
} from '../services/aumentosService'
import { obtenerSeriesArgly } from '../services/arglyService'
import {
  eliminarIndiceManual,
  guardarIndiceManual,
  guardarIndicesManuales,
} from '../services/indicesManualesService'
import { diasHastaFinPeriodoOperativo, hoyIsoLocal, periodoOperativoInfo } from '../utils/aumentosUi'
import { iclCierrePublicado, iclValorEnFecha, rangosIndicesParaContratos } from '../utils/calcularAumento'

function formatearErroresConfirmacion(errores) {
  if (!Array.isArray(errores) || errores.length === 0) return ''
  return errores.map((e) => `Contrato #${e.contrato_id}: ${e.error}`).join(' · ')
}

/**
 * Contratos con aumento en la bandeja (ya calculados, con los índices oficiales y los cargados a
 * mano), los confirmados del período que se trabaja y las revisiones guardadas.
 */
// Última bandeja consultada: al volver a Aumentos se muestra enseguida y se actualiza por detrás.
let ultimaBandeja = null

async function consultarBandeja({ diasProximos, overrides = {} } = {}) {
  const clavePeriodo = periodoOperativoInfo(hoyIsoLocal()).clave
  const confirmadosPromesa = listarAumentosConfirmadosEnPeriodo({ claveMes: clavePeriodo })
  await ejecutarMantenimientoContratos()
  const [calculo, confirmados, revisiones] = await Promise.all([
    calcularAumentosPendientes({
      incluirProximos: true,
      diasProximos: diasProximos ?? diasHastaFinPeriodoOperativo(),
      skipMaintenance: true,
      overrides,
    }),
    confirmadosPromesa,
    listarRevisionesAumento(),
  ])
  const resultado = { calculo, confirmados, revisiones }
  const esLaBandejaDelPeriodo = diasProximos == null && Object.keys(overrides).length === 0
  if (esLaBandejaDelPeriodo && !calculo.error) ultimaBandeja = { ...resultado, clavePeriodo }
  return resultado
}

/** Consulta la bandeja por detrás (al entrar al panel) si todavía no hay una del período. */
export function precargarBandejaAumentos() {
  return bandejaGuardada() ? Promise.resolve() : consultarBandeja().catch(() => {})
}

/** La bandeja guardada, si es del período que se trabaja hoy. */
function bandejaGuardada() {
  return ultimaBandeja?.clavePeriodo === periodoOperativoInfo(hoyIsoLocal()).clave ? ultimaBandeja : null
}

/**
 * Valores que se cargaron en el detalle de un aumento → filas de indices_manuales. Solo se guardan
 * los que Argly no publicó: el oficial siempre gana.
 */
function indicesDesdeCargaManual(contrato, override, series) {
  const desde = contrato.fecha_ultimo_aumento ?? contrato.fecha_inicio
  const hasta = contrato.fecha_proximo_aumento
  if (override?.ipcMeses) {
    return Object.entries(override.ipcMeses)
      .filter(([clave]) => {
        const [anio, mes] = clave.split('-').map(Number)
        return !(series.ipc ?? []).some((r) => Number(r.anio) === anio && Number(r.mes) === mes && Number(r.valor) > 0)
      })
      .map(([clave, valor]) => ({ tipo: 'ipc', mes: clave, valor }))
  }
  const entradas = []
  if (override?.iclInicio && !iclValorEnFecha(series.icl, desde)) {
    entradas.push({ tipo: 'icl', fecha: desde, valor: override.iclInicio })
  }
  if (override?.iclFin && !iclCierrePublicado(series.icl, hasta)) {
    entradas.push({ tipo: 'icl', fecha: hasta, valor: override.iclFin })
  }
  return entradas
}

export function useAumentos() {
  const [propuestas, setPropuestas] = useState([])
  const [confirmadosPeriodo, setConfirmadosPeriodo] = useState([])
  const [meta, setMeta] = useState(null)
  const [indicesResumen, setIndicesResumen] = useState({ icl: null, ipc: null })
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(null)
  const [syncWarning, setSyncWarning] = useState(null)
  const [colaCalculo, setColaCalculo] = useState({
    contratos: [],
    series: { icl: [], ipc: [] },
    registradosPorClave: {},
    indicesManuales: [],
  })
  const [overrides, setOverrides] = useState({})
  const [revisiones, setRevisiones] = useState(() => new Map())

  // Aplica el resultado de consultarBandeja. Si es una recarga sin índices manuales, los descarta.
  const aplicarBandeja = useCallback(({ calculo, confirmados, revisiones: guardadas, keepOverrides }) => {
    if (!keepOverrides) setOverrides({})
    if (guardadas && !guardadas.error) setRevisiones(guardadas.data ?? new Map())

    if (calculo.error) {
      setError(calculo.error.message)
      setPropuestas([])
      setConfirmadosPeriodo([])
      setMeta(null)
      setIndicesResumen({ icl: null, ipc: null })
      setLoading(false)
      return false
    }

    const { data } = calculo
    const lista = Array.isArray(data?.propuestas) ? data.propuestas : []
    setError(null)
    setPropuestas(lista)
    setConfirmadosPeriodo(!confirmados.error && Array.isArray(confirmados.data) ? confirmados.data : [])
    setMeta({ total: lista.length, fecha_calculo: data?.fecha_calculo })
    setIndicesResumen(data?.indicesResumen ?? { icl: null, ipc: null })
    setColaCalculo({
      contratos: data?.contratos ?? [],
      series: data?.series ?? { icl: [], ipc: [] },
      registradosPorClave: data?.registradosPorClave ?? {},
      indicesManuales: data?.indicesManuales ?? [],
    })
    setSyncWarning(
      data?.indicesError
        ? 'No pudimos obtener los índices oficiales (Argly). Podés cargarlos a mano en "Carga manual de índices".'
        : null
    )
    setLoading(false)
    return true
  }, [])

  /** Recarga desde la pantalla (Actualizar, después de confirmar o deshacer), con indicador de carga. */
  const cargarAumentos = useCallback(
    async ({ diasProximos, keepOverrides = false } = {}) => {
      setLoading(true)
      const resultado = await consultarBandeja({ diasProximos, overrides: keepOverrides ? overrides : {} })
      return aplicarBandeja({ ...resultado, keepOverrides })
    },
    [overrides, aplicarBandeja]
  )

  useEffect(() => {
    let vigente = true
    const guardada = bandejaGuardada()
    if (guardada) {
      Promise.resolve().then(() => vigente && aplicarBandeja({ ...guardada, keepOverrides: false }))
    }
    consultarBandeja().then((resultado) => {
      if (vigente) aplicarBandeja({ ...resultado, keepOverrides: false })
    })
    return () => {
      vigente = false
    }
  }, [aplicarBandeja])

  /**
   * Índices cargados desde el detalle de un aumento: se guardan en indices_manuales (sirven para
   * todos los aumentos que los usen) y se recalcula la bandeja.
   */
  const aplicarIndicesManuales = useCallback(
    async (contratoId, override) => {
      const contrato = colaCalculo.contratos.find((c) => Number(c.id) === Number(contratoId))
      if (!contrato) return { error: { message: 'No se encontró el contrato' } }
      const { error: errorGuardado } = await guardarIndicesManuales(indicesDesdeCargaManual(contrato, override, colaCalculo.series))
      if (errorGuardado) return { error: errorGuardado }
      await cargarAumentos()
      return { error: null }
    },
    [colaCalculo, cargarAumentos]
  )

  /** Formulario "Carga manual de índices" (CU-024): guarda y recalcula los aumentos que lo usan. */
  const guardarIndice = useCallback(
    async (entrada) => {
      const resultado = await guardarIndiceManual(entrada)
      if (!resultado.error) await cargarAumentos()
      return resultado
    },
    [cargarAumentos]
  )

  const eliminarIndice = useCallback(
    async (id) => {
      const resultado = await eliminarIndiceManual(id)
      if (!resultado.error) await cargarAumentos()
      return resultado
    },
    [cargarAumentos]
  )

  /** Marca de revisado, observaciones y redondeo de un aumento pendiente (se guardan en la base). */
  const guardarRevision = useCallback(async (propuesta, cambios) => {
    const clave = claveRevision(propuesta.contrato_id, propuesta.fecha_hasta)
    const { data, error: errorRevision } = await guardarRevisionAumento({
      contratoId: propuesta.contrato_id,
      fechaAplicacion: propuesta.fecha_hasta,
      ...cambios,
    })
    if (errorRevision) {
      setError(`No se pudo guardar la revisión: ${errorRevision.message}`)
      return { error: errorRevision }
    }
    setRevisiones((prev) => new Map(prev).set(clave, data))
    return { data, error: null }
  }, [])

  /** Vuelve a consultar Argly para un contrato al abrir el detalle del cálculo. */
  const refrescarIndicesContrato = useCallback(
    async (contratoId) => {
      const contrato = colaCalculo.contratos.find((c) => Number(c.id) === Number(contratoId))
      if (!contrato) return
      const hoy = hoyIsoLocal()
      const { data, error: arglyError } = await obtenerSeriesArgly(rangosIndicesParaContratos([contrato], hoy))
      if (arglyError || !data) return

      const unir = (actual, nueva, clave) => {
        const mapa = new Map((actual ?? []).map((row) => [clave(row), row]))
        for (const row of nueva ?? []) mapa.set(clave(row), row)
        return [...mapa.values()]
      }
      const series = {
        icl: unir(colaCalculo.series.icl, data.icl, (r) => r.fecha),
        ipc: unir(colaCalculo.series.ipc, data.ipc, (r) => `${r.anio}-${r.mes}`),
      }

      setColaCalculo((prev) => ({ ...prev, series }))
      setPropuestas(
        recalcularPropuestasConOverrides({
          contratos: colaCalculo.contratos,
          series,
          registradosPorClave: colaCalculo.registradosPorClave,
          overrides,
          hoy,
          indicesManuales: colaCalculo.indicesManuales,
        })
      )
    },
    [colaCalculo, overrides]
  )

  const confirmarSeleccionados = useCallback(
    async (propuestasSeleccionadas) => {
      if (!propuestasSeleccionadas.length) {
        setError('No hay aumentos listos para confirmar')
        return { ok: false, data: null, errores: [], contratoIdsConfirmados: [] }
      }

      setConfirmando(true)
      setError(null)

      const { data, error: confirmError } = await confirmarAumentos(propuestasSeleccionadas)

      if (confirmError) {
        setError(confirmError.message)
        setConfirmando(false)
        return { ok: false, data: null, errores: [], contratoIdsConfirmados: [] }
      }

      const confirmados = data?.confirmados ?? 0
      const errores = Array.isArray(data?.errores) ? data.errores : []
      const failedIds = new Set(errores.map((e) => Number(e.contrato_id)))
      const contratoIdsConfirmados = propuestasSeleccionadas
        .map((p) => p.contrato_id)
        .filter((id) => !failedIds.has(Number(id)))

      if (confirmados === 0 && errores.length > 0) {
        setError(formatearErroresConfirmacion(errores))
        setConfirmando(false)
        return { ok: false, data, errores, contratoIdsConfirmados: [] }
      }

      if (errores.length > 0) {
        setSyncWarning(
          `Se confirmaron ${confirmados} aumento(s). ${errores.length} no se aplicaron: ${formatearErroresConfirmacion(errores)}`
        )
      }

      const confirmadas = propuestasSeleccionadas.filter(
        (p) => !failedIds.has(Number(p.contrato_id))
      )
      const { fallidos } = await generarComprobantesAumentos(confirmadas)
      if (fallidos > 0) {
        setSyncWarning((prev) => {
          const aviso = `No se pudo generar el comprobante de ${fallidos} aumento(s).`
          return prev ? `${prev} ${aviso}` : aviso
        })
      }

      await cargarAumentos({ keepOverrides: false })
      setConfirmando(false)
      return { ok: true, data, errores, contratoIdsConfirmados }
    },
    [cargarAumentos]
  )

  const limpiarError = useCallback(() => {
    setError(null)
    setSyncWarning(null)
  }, [])

  return {
    propuestas,
    confirmadosPeriodo,
    meta,
    indicesResumen,
    loading,
    confirmando,
    error,
    syncWarning,
    cargarAumentos,
    confirmarSeleccionados,
    aplicarIndicesManuales,
    refrescarIndicesContrato,
    indicesManuales: colaCalculo.indicesManuales,
    guardarIndice,
    eliminarIndice,
    revisiones,
    guardarRevision,
    limpiarError,
  }
}
