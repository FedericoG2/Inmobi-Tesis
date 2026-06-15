import { normalizarSoloDigitos } from './normalizarContacto'

function quitarTildes(valor) {
  return (valor ?? '').normalize('NFD').replace(/\p{M}/gu, '')
}

function colapsarEspacios(valor) {
  return (valor ?? '').trim().replace(/\s+/g, ' ')
}

const RE_ALTURA_CON_ESPACIO = /\s+\d{2,}[a-zA-Z]?\s*$/u
const RE_ALTURA_PEGADA = /(?<=[\p{L}])\d{2,}[a-zA-Z]?\s*$/u

/** Detecta altura al final, con o sin espacio (ej. "Chacabuco 1250" o "Chacabuco1250"). */
export function calleTieneAlturaIncluida(valor) {
  const v = colapsarEspacios(valor)
  return RE_ALTURA_CON_ESPACIO.test(v) || RE_ALTURA_PEGADA.test(v)
}

/** Quita altura pegada al final por error. */
export function limpiarNombreCalle(valor) {
  return colapsarEspacios(valor)
    .replace(RE_ALTURA_PEGADA, '')
    .replace(RE_ALTURA_CON_ESPACIO, '')
    .trim()
}

/** Clave de comparación: minúsculas, sin tildes, prefijos de vía unificados. */
export function normalizarCalle(valor) {
  let v = limpiarNombreCalle(valor)
  v = quitarTildes(v).toLowerCase()
  v = v
    .replace(/\bavenida\b/g, 'av')
    .replace(/\bboulevard\b/g, 'bv')
    .replace(/\bblvd\.?\s*/g, 'bv ')
    .replace(/\bcalle\b/g, 'c')
  // av. / av / bv. / c. → forma canónica sin punto (evita claves distintas para la misma calle)
  v = v.replace(/\b(av|bv|c)\.?\s+/g, '$1 ')
  return colapsarEspacios(v).trim()
}

/** Solo dígitos para la clave de unicidad. */
export function normalizarAltura(valor) {
  const digitos = normalizarSoloDigitos(valor)
  return digitos || colapsarEspacios(valor)
}

/** PB / 0 / vacío → '' para comparar; resto en mayúsculas. */
export function normalizarPiso(valor) {
  const v = colapsarEspacios(valor).toUpperCase()
  if (!v || v === 'PB' || v === '0' || v === 'PLANTA BAJA') return ''
  return v
}

export function normalizarUnidad(valor) {
  return colapsarEspacios(valor).toUpperCase()
}

/** Clave de comparación: minúsculas, sin tildes. */
export function normalizarCiudad(valor) {
  let v = colapsarEspacios(valor)
  v = quitarTildes(v).toLowerCase()
  return v.trim()
}

export function claveUbicacion({ calle, altura, piso, unidad, ciudad }) {
  return {
    calle_norm: normalizarCalle(calle),
    altura_norm: normalizarAltura(altura),
    piso_norm: normalizarPiso(piso),
    unidad_norm: normalizarUnidad(unidad),
    ciudad_norm: normalizarCiudad(ciudad),
  }
}

function etiquetaPiso(piso) {
  const v = colapsarEspacios(piso)
  if (!v) return null
  const upper = v.toUpperCase()
  if (upper === 'PB' || upper === '0' || upper === 'PLANTA BAJA') return 'PB'
  return `Piso ${v}`
}

function etiquetaUnidad(unidad) {
  const v = colapsarEspacios(unidad)
  if (!v) return null
  const lower = v.toLowerCase()
  if (lower.startsWith('depto') || lower.startsWith('local') || lower.startsWith('unidad')) {
    return v
  }
  if (/^local\b/i.test(v)) return v
  return `Depto ${v}`
}

/** Dirección legible para grilla, contratos y reclamos. */
export function formatearDireccionCompleta({ calle, altura, piso, unidad, ciudad }) {
  const calleLimpia = colapsarEspacios(calle)
  const alturaLimpia = colapsarEspacios(altura)
  const partes = [`${calleLimpia} ${alturaLimpia}`]

  const pisoFmt = etiquetaPiso(piso)
  if (pisoFmt) partes.push(pisoFmt)

  const unidadFmt = etiquetaUnidad(unidad)
  if (unidadFmt) partes.push(unidadFmt)

  const ciudadLimpia = colapsarEspacios(ciudad)
  if (ciudadLimpia) partes.push(ciudadLimpia)

  return partes.join(', ')
}
