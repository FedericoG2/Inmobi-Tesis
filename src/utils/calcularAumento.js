/** Cálculo de aumentos ICL/IPC en el cliente. Sin tabla `indices`. */
import { aumentoEnBandeja } from './aumentosUi'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function claveMesIpc(anio, mes) {
  return `${anio}-${pad2(mes)}`
}

function roundPesos(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return null
  return Math.round(Number(valor))
}

function roundPct(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return null
  return Math.round(Number(valor) * 100) / 100
}

/** Meses IPC: mes de fechaDesde hasta el mes anterior a fechaHasta (inclusive). */
export function mesesIpcPeriodo(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta || fechaHasta <= fechaDesde) return []

  const [y0, m0] = fechaDesde.split('-').map(Number)
  const [y1, m1] = fechaHasta.split('-').map(Number)

  let endY = y1
  let endM = m1 - 1
  if (endM < 1) {
    endM = 12
    endY -= 1
  }

  const meses = []
  let y = y0
  let m = m0
  while (y < endY || (y === endY && m <= endM)) {
    meses.push({ anio: y, mes: m, clave: claveMesIpc(y, m) })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return meses
}

export function iclValorEnFecha(serie, fecha) {
  const validas = (serie ?? [])
    .map((row) => ({
      fecha: row.fecha,
      valor: Number(row.valor),
    }))
    .filter((row) => row.fecha && row.fecha <= fecha && Number.isFinite(row.valor) && row.valor > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return validas.at(-1) ?? null
}

/** Hay publicación que cubre la fecha de cierre (no usamos un ICL más viejo como si fuera definitivo). */
export function iclCierrePublicado(serie, fechaHasta) {
  return (serie ?? []).some((row) => row.fecha && row.fecha >= fechaHasta && Number(row.valor) > 0)
}

function ipcValorMes(serie, anio, mes) {
  const row = (serie ?? []).find(
    (item) => Number(item.anio) === Number(anio) && Number(item.mes) === Number(mes)
  )
  const valor = row != null ? Number(row.valor) : NaN
  if (!Number.isFinite(valor) || valor <= 0) return null
  return valor
}

export function rangosIndicesParaContratos(contratos, hoy) {
  const lista = (contratos ?? []).filter((c) => c.fecha_proximo_aumento)
  if (lista.length === 0) {
    const anio = Number(hoy.slice(0, 4))
    return {
      icl: { desde: `${anio - 1}-01-01`, hasta: hoy },
      ipc: { desde: `${anio}-01`, hasta: hoy.slice(0, 7) },
    }
  }

  let minDesde = lista[0].fecha_ultimo_aumento ?? lista[0].fecha_inicio
  let maxHasta = lista[0].fecha_proximo_aumento

  for (const c of lista) {
    const fd = c.fecha_ultimo_aumento ?? c.fecha_inicio
    const fh = c.fecha_proximo_aumento
    if (fd && fd < minDesde) minDesde = fd
    if (fh && fh > maxHasta) maxHasta = fh
  }

  const [y, m, d] = minDesde.split('-').map(Number)
  const desdeIclDate = new Date(y, m - 1, d - 7)
  const iclDesde = `${desdeIclDate.getFullYear()}-${pad2(desdeIclDate.getMonth() + 1)}-${pad2(desdeIclDate.getDate())}`

  const ipcMeses = lista.flatMap((c) =>
    mesesIpcPeriodo(c.fecha_ultimo_aumento ?? c.fecha_inicio, c.fecha_proximo_aumento)
  )
  const ipcClaves = ipcMeses.map((item) => item.clave).sort()

  return {
    icl: { desde: iclDesde, hasta: maxHasta > hoy ? maxHasta : hoy },
    ipc: {
      desde: ipcClaves[0] ?? hoy.slice(0, 7),
      hasta: ipcClaves.at(-1) ?? hoy.slice(0, 7),
    },
  }
}

function basePropuesta(contrato, hoy) {
  const tipo = (contrato.tipo_ajuste ?? '').toLowerCase()
  const fechaDesde = contrato.fecha_ultimo_aumento ?? contrato.fecha_inicio
  const fechaHasta = contrato.fecha_proximo_aumento

  return {
    contrato_id: contrato.id ?? contrato.contrato_id,
    tipo_ajuste: tipo,
    indice_tipo: tipo,
    inquilino_nombre: contrato.inquilino_nombre ?? contrato.inquilinos?.nombre_completo ?? null,
    propiedad_direccion: contrato.propiedad_direccion ?? contrato.propiedades?.direccion ?? null,
    monto_actual: contrato.monto_alquiler != null ? Number(contrato.monto_alquiler) : null,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    fecha_proximo_aumento: fechaHasta,
    es_vencido: Boolean(fechaHasta && hoy && fechaHasta <= hoy),
    modo: 'calculado',
    es_aproximado: false,
    fuente: 'argly',
    ipc_detalle: null,
    ipc_factor: null,
    ipc_meses: null,
    ipc_meses_esperados: null,
    indice_valor_inicio: null,
    indice_valor_fin: null,
    monto_propuesto: null,
    variacion_pct: null,
    confirmable: false,
    ya_acordado: false,
    ya_aplicado: false,
    programado: false,
    monto_acordado: null,
    detalle_calculo: null,
  }
}

function propuestaFaltaIndice(base, extra = {}) {
  return {
    ...base,
    estado: 'falta_indice',
    confirmable: false,
    monto_propuesto: null,
    variacion_pct: null,
    ...extra,
  }
}

function armarDetalle(base, extra = {}) {
  return {
    tipo: base.tipo_ajuste,
    fecha_desde: base.fecha_desde,
    fecha_hasta: base.fecha_hasta,
    monto_anterior: base.monto_actual,
    monto_nuevo: extra.monto_nuevo ?? base.monto_propuesto,
    variacion_pct: extra.variacion_pct ?? base.variacion_pct,
    modo: extra.modo ?? base.modo,
    indice_tipo: base.tipo_ajuste,
    es_aproximado: Boolean(extra.es_aproximado ?? base.es_aproximado),
    fuente: extra.fuente ?? base.fuente,
    ...extra,
  }
}

function calcularIcl(base, serieIcl, override) {
  const manualInicio = override?.iclInicio != null && override.iclInicio !== ''
    ? Number(override.iclInicio)
    : null
  const manualFin = override?.iclFin != null && override.iclFin !== ''
    ? Number(override.iclFin)
    : null
  const usoManual = Number.isFinite(manualInicio) && manualInicio > 0 && Number.isFinite(manualFin) && manualFin > 0

  const inicio = usoManual
    ? { fecha: base.fecha_desde, valor: manualInicio }
    : iclValorEnFecha(serieIcl, base.fecha_desde)
  const fin = usoManual
    ? { fecha: base.fecha_hasta, valor: manualFin }
    : iclValorEnFecha(serieIcl, base.fecha_hasta)
  const cierrePublicado = usoManual || iclCierrePublicado(serieIcl, base.fecha_hasta)

  if (!inicio || !fin || inicio.valor <= 0) {
    return propuestaFaltaIndice(base, {
      indice_valor_inicio: inicio?.valor ?? null,
      indice_valor_fin: fin?.valor ?? null,
      ipc_detalle: null,
    })
  }

  const proporcion = fin.valor / inicio.valor
  const montoPropuesto = roundPesos(base.monto_actual * proporcion)
  const variacion = roundPct((proporcion - 1) * 100)
  const fuente = usoManual ? 'manual' : 'argly'
  const aproximado = !cierrePublicado

  const propuesta = {
    ...base,
    estado: 'ok',
    fuente,
    modo: usoManual ? 'manual' : 'calculado',
    es_aproximado: aproximado,
    indice_valor_inicio: inicio.valor,
    indice_valor_fin: fin.valor,
    icl_fecha_fin_usada: fin.fecha,
    monto_propuesto: montoPropuesto,
    variacion_pct: variacion,
    confirmable: montoPropuesto != null,
  }

  propuesta.detalle_calculo = armarDetalle(propuesta, {
    icl_inicio: inicio.valor,
    icl_fin: fin.valor,
    icl_fecha_fin_usada: fin.fecha,
    proporcion: Math.round(proporcion * 1e6) / 1e6,
    fuente,
    es_aproximado: aproximado,
    monto_nuevo: montoPropuesto,
    variacion_pct: variacion,
    modo: propuesta.modo,
  })

  return propuesta
}

function calcularIpc(base, serieIpc, override) {
  const meses = mesesIpcPeriodo(base.fecha_desde, base.fecha_hasta)
  const overrideMap = override?.ipcMeses ?? {}
  let usoManual = false

  const detalle = meses.map((mes) => {
    const clave = mes.clave
    const manual = overrideMap[clave]
    const valorManual = manual != null && manual !== '' ? Number(manual) : null
    if (Number.isFinite(valorManual) && valorManual > 0) {
      usoManual = true
      return { anio: mes.anio, mes: mes.mes, variacion_pct: valorManual, publicado: true, fuente: 'manual' }
    }
    const publicado = ipcValorMes(serieIpc, mes.anio, mes.mes)
    return {
      anio: mes.anio,
      mes: mes.mes,
      variacion_pct: publicado,
      publicado: publicado != null,
      fuente: publicado != null ? 'argly' : null,
    }
  })

  const publicados = detalle.filter((m) => m.publicado)
  if (meses.length === 0 || publicados.length === 0) {
    return propuestaFaltaIndice(base, {
      ipc_detalle: detalle,
      ipc_meses: publicados.length,
      ipc_meses_esperados: meses.length,
    })
  }

  let factor = 1
  for (const mes of publicados) {
    factor *= 1 + Number(mes.variacion_pct) / 100
  }

  const montoPropuesto = roundPesos(base.monto_actual * factor)
  const variacion = roundPct((factor - 1) * 100)
  const fuente = usoManual ? 'manual' : 'argly'
  const aproximado = publicados.length !== meses.length

  const propuesta = {
    ...base,
    estado: 'ok',
    fuente,
    modo: usoManual ? 'manual' : 'calculado',
    es_aproximado: aproximado,
    ipc_detalle: detalle,
    ipc_factor: factor,
    ipc_meses: publicados.length,
    ipc_meses_esperados: meses.length,
    monto_propuesto: montoPropuesto,
    variacion_pct: variacion,
    confirmable: montoPropuesto != null,
  }

  propuesta.detalle_calculo = armarDetalle(propuesta, {
    factor,
    meses_aplicados: publicados.length,
    meses_esperados: meses.length,
    detalle_meses: detalle,
    fuente,
    es_aproximado: aproximado,
    monto_nuevo: montoPropuesto,
    variacion_pct: variacion,
    modo: propuesta.modo,
  })

  return propuesta
}

/**
 * @param {object} params
 * @param {object} params.contrato
 * @param {Array} [params.serieIcl]
 * @param {Array} [params.serieIpc]
 * @param {object|null} [params.override]
 * @param {object|null} [params.acordado]
 * @param {string} params.hoy
 */
export function calcularPropuestaAumento({
  contrato,
  serieIcl = [],
  serieIpc = [],
  override = null,
  acordado = null,
  hoy,
}) {
  const base = basePropuesta(contrato, hoy)
  const tipo = base.tipo_ajuste

  if (acordado) {
    const montoNuevo = Number(acordado.monto_nuevo)
    const aplicado = Boolean(acordado.aplicado)
    const variacion =
      base.monto_actual > 0 && Number.isFinite(montoNuevo)
        ? roundPct((montoNuevo / base.monto_actual - 1) * 100)
        : null

    return {
      ...base,
      estado: aplicado ? 'aplicado' : 'programado',
      monto_propuesto: montoNuevo,
      monto_acordado: montoNuevo,
      variacion_pct: variacion,
      ya_acordado: !aplicado,
      programado: !aplicado,
      ya_aplicado: aplicado,
      confirmable: false,
      es_aproximado: Boolean(acordado.detalle_calculo?.es_aproximado),
      fuente: acordado.detalle_calculo?.fuente ?? 'argly',
      detalle_calculo: acordado.detalle_calculo ?? null,
      indice_valor_inicio: acordado.detalle_calculo?.icl_inicio ?? acordado.indice_valor_inicio ?? null,
      indice_valor_fin: acordado.detalle_calculo?.icl_fin ?? acordado.indice_valor_fin ?? null,
      icl_fecha_fin_usada: acordado.detalle_calculo?.icl_fecha_fin_usada ?? null,
      ipc_factor: acordado.detalle_calculo?.factor ?? null,
      ipc_detalle: acordado.detalle_calculo?.detalle_meses ?? null,
      ipc_meses: acordado.detalle_calculo?.meses_aplicados ?? null,
      ipc_meses_esperados: acordado.detalle_calculo?.meses_esperados ?? null,
    }
  }

  let propuesta
  if (tipo === 'icl') propuesta = calcularIcl(base, serieIcl, override)
  else if (tipo === 'ipc') propuesta = calcularIpc(base, serieIpc, override)
  else return propuestaFaltaIndice(base)

  if (propuesta.confirmable && !aumentoEnBandeja(base.fecha_hasta, hoy)) {
    propuesta.confirmable = false
  }
  return propuesta
}

export function ultimoIclDeSerie(serie) {
  const orden = [...(serie ?? [])]
    .filter((row) => row.fecha && Number(row.valor) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const last = orden.at(-1)
  return last ? { fecha: last.fecha, valor: Number(last.valor) } : null
}

export function ultimoIpcDeSerie(serie) {
  const orden = [...(serie ?? [])]
    .filter((row) => Number(row.anio) && Number(row.mes) && Number(row.valor) > 0)
    .sort((a, b) => (a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes))
  const last = orden.at(-1)
  return last
    ? { anio: Number(last.anio), mes: Number(last.mes), valor: Number(last.valor) }
    : null
}
