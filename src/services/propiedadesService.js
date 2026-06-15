import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'
import {
  claveUbicacion,
  formatearDireccionCompleta,
  limpiarNombreCalle,
  normalizarAltura,
} from '../utils/normalizarUbicacion'
import { TIPOS_PROPIEDAD, ESTADOS_PROPIEDAD, CIUDADES_PROPIEDAD } from '../utils/validaciones'

export { esErrorContratosActivos as esErrorContratosAsociados }

const SELECT_PROPIEDAD = `
  id,
  propietario_id,
  calle,
  altura,
  piso,
  unidad,
  ciudad,
  direccion,
  tipo,
  estado,
  propietarios ( nombre_completo )
`

function tieneHistorialPropiedad(deps) {
  return (
    (deps.contratos_activos ?? 0) > 0 ||
    (deps.contratos_historicos ?? 0) > 0 ||
    (deps.reclamos ?? 0) > 0
  )
}

function sanitizarPropiedad(datos) {
  const tipo = datos.tipo
  const estado = datos.estado

  if (!TIPOS_PROPIEDAD.includes(tipo)) {
    return { error: { message: `Tipo de propiedad inválido: "${tipo}"` } }
  }
  if (!ESTADOS_PROPIEDAD.includes(estado)) {
    return { error: { message: `Estado de propiedad inválido: "${estado}"` } }
  }

  const calle = limpiarNombreCalle((datos.calle ?? '').trim().replace(/\s+/g, ' '))
  const altura = normalizarAltura(datos.altura)
  const pisoRaw = (datos.piso ?? '').trim() || null
  const unidadRaw = (datos.unidad ?? '').trim() || null
  const ciudad = (datos.ciudad ?? '').trim()
  if (!CIUDADES_PROPIEDAD.includes(ciudad)) {
    return { error: { message: 'Seleccioná una ciudad válida de la lista' } }
  }

  if (!calle) {
    return { error: { message: 'La calle es obligatoria' } }
  }
  if (!altura) {
    return { error: { message: 'La altura es obligatoria' } }
  }

  const norm = claveUbicacion({ calle, altura, piso: pisoRaw, unidad: unidadRaw, ciudad })
  const direccion = formatearDireccionCompleta({
    calle,
    altura: datos.altura,
    piso: pisoRaw,
    unidad: unidadRaw,
    ciudad,
  })

  return {
    datos: {
      propietario_id: datos.propietario_id ? Number(datos.propietario_id) : null,
      calle,
      altura: (datos.altura ?? '').trim().replace(/\s+/g, ' '),
      piso: pisoRaw,
      unidad: unidadRaw,
      ciudad,
      calle_norm: norm.calle_norm,
      altura_norm: norm.altura_norm,
      piso_norm: norm.piso_norm,
      unidad_norm: norm.unidad_norm,
      ciudad_norm: norm.ciudad_norm,
      direccion,
      tipo,
      estado,
    },
  }
}

async function verificarUbicacionUnica(norm, excluirId = null) {
  let query = supabase
    .from('propiedades')
    .select('id')
    .eq('calle_norm', norm.calle_norm)
    .eq('altura_norm', norm.altura_norm)
    .eq('piso_norm', norm.piso_norm ?? '')
    .eq('unidad_norm', norm.unidad_norm ?? '')
    .eq('ciudad_norm', norm.ciudad_norm)

  if (excluirId !== null) {
    query = query.neq('id', excluirId)
  }

  const { data, error } = await query.limit(1)
  if (error) return { error }
  return { existe: (data?.length ?? 0) > 0 }
}

function errorUbicacionDuplicada(error, datos) {
  if (error?.code === '23505') {
    return { message: mensajeUbicacionDuplicada(datos) }
  }
  return error
}

function mensajeUbicacionDuplicada(datos) {
  const base = `${datos.calle} ${datos.altura}`
  const extras = []
  if (datos.piso) extras.push(`piso ${datos.piso}`)
  if (datos.unidad) extras.push(`unidad ${datos.unidad}`)
  const detalle = extras.length > 0 ? ` (${extras.join(', ')})` : ''
  const ciudad = datos.ciudad ? `, ${datos.ciudad}` : ''
  return `Ya existe una propiedad registrada en ${base}${detalle}${ciudad}`
}

export async function listarPropiedades() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .select(SELECT_PROPIEDAD)
    .order('direccion')

  return { data, error }
}

export async function crearPropiedad(propiedad) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!propiedad.propietario_id) {
    return { data: null, error: { message: 'Debe asignar un propietario a la propiedad' } }
  }

  const sanitizado = sanitizarPropiedad(propiedad)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  if (sanitizado.datos.estado === 'Alquilada') {
    return {
      data: null,
      error: {
        message:
          'Una propiedad nueva no puede crearse en estado Alquilada. Ese estado se asigna al vincular un contrato.',
      },
    }
  }

  const norm = claveUbicacion(sanitizado.datos)
  const { existe, error: errVerif } = await verificarUbicacionUnica(norm)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return { data: null, error: { message: mensajeUbicacionDuplicada(sanitizado.datos) } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .insert(sanitizado.datos)
    .select(SELECT_PROPIEDAD)
    .single()

  if (error) {
    return { data: null, error: errorUbicacionDuplicada(error, sanitizado.datos) }
  }

  return { data, error: null }
}

export async function actualizarPropiedad(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!datos.propietario_id) {
    return { data: null, error: { message: 'Debe asignar un propietario a la propiedad' } }
  }

  const deps = await contarDependenciasPropiedad(id)
  if (deps.error) return { data: null, error: deps.error }

  const conHistorial = tieneHistorialPropiedad(deps)
  const conContratoActivo = (deps.contratos_activos ?? 0) > 0
  let datosEdit = { ...datos }

  if (conHistorial || conContratoActivo) {
    const { data: actual, error: errActual } = await supabase
      .from('propiedades')
      .select('tipo, estado, calle, altura, piso, unidad, ciudad')
      .eq('id', id)
      .single()

    if (errActual) return { data: null, error: errActual }

    if (conHistorial) {
      datosEdit = {
        ...datosEdit,
        tipo: actual.tipo,
        calle: actual.calle,
        altura: actual.altura,
        piso: actual.piso,
        unidad: actual.unidad,
        ciudad: actual.ciudad,
      }
    }

    if (conContratoActivo) {
      datosEdit.estado = actual.estado
    }
  }

  const sanitizado = sanitizarPropiedad(datosEdit)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  if (sanitizado.datos.estado === 'Alquilada') {
    if ((deps.contratos_activos ?? 0) === 0) {
      return {
        data: null,
        error: {
          message:
            'El estado Alquilada solo puede asignarse automáticamente al vincular un contrato activo.',
        },
      }
    }
  }

  const norm = claveUbicacion(sanitizado.datos)
  const { existe, error: errVerif } = await verificarUbicacionUnica(norm, id)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return { data: null, error: { message: mensajeUbicacionDuplicada(sanitizado.datos) } }
  }

  const { data, error } = await supabase
    .from('propiedades')
    .update(sanitizado.datos)
    .eq('id', id)
    .select(SELECT_PROPIEDAD)
    .single()

  if (error) {
    return { data: null, error: errorUbicacionDuplicada(error, sanitizado.datos) }
  }

  return { data, error: null }
}

/** Deriva Disponible / Alquilada según contratos activos de la propiedad. */
export async function sincronizarEstadoPropiedadPorContratos(propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { count, error: countError } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('propiedad_id', propiedadId)
    .eq('activo', true)

  if (countError) return { error: countError }

  const estado = (count ?? 0) > 0 ? 'Alquilada' : 'Disponible'

  const { error } = await supabase.from('propiedades').update({ estado }).eq('id', propiedadId)

  return { error }
}

/**
 * Devuelve la cantidad de contratos activos, contratos históricos y reclamos
 * asociados a una propiedad. Usado para bloquear o advertir antes de eliminar.
 */
export async function contarDependenciasPropiedad(propiedadId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const [contratosActivosRes, contratosHistoricosRes, reclamosRes] = await Promise.all([
    supabase
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)
      .eq('activo', true),
    supabase
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)
      .eq('activo', false),
    supabase
      .from('reclamos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId),
  ])

  if (contratosActivosRes.error) return { error: contratosActivosRes.error }
  if (contratosHistoricosRes.error) return { error: contratosHistoricosRes.error }
  if (reclamosRes.error) return { error: reclamosRes.error }

  return {
    contratos_activos: contratosActivosRes.count ?? 0,
    contratos_historicos: contratosHistoricosRes.count ?? 0,
    reclamos: reclamosRes.count ?? 0,
  }
}

export async function eliminarPropiedad(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('propiedades').delete().eq('id', id)

  return { error }
}
