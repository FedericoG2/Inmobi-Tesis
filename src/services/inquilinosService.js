import { supabase } from '../supabaseClient'
import { esErrorContratosActivos } from '../utils/esErrorContratosActivos'
import {
  normalizarNombreCompleto,
  normalizarSoloDigitos,
} from '../utils/normalizarContacto'
import { TIPOS_GARANTIA_INQUILINO } from '../utils/validaciones'

export { esErrorContratosActivos as esErrorContratosAsociados }

const COLUMNAS_INQUILINO =
  'id, perfil_id, tipo_persona, nombre_completo, dni_cuit, telefono, email, fecha_nacimiento, estado_civil, ocupacion, tipo_garantia, emergencia_nombre, emergencia_telefono, observaciones'

function sanitizarInquilino(datos) {
  const tipoGarantia = TIPOS_GARANTIA_INQUILINO.includes(datos.tipo_garantia)
    ? datos.tipo_garantia
    : null

  if (!tipoGarantia) {
    return { error: { message: 'Seleccioná un tipo de garantía válido' } }
  }

  const esJuridica = datos.tipo_persona === 'Jurídica'

  return {
    datos: {
      tipo_persona: esJuridica ? 'Jurídica' : 'Física',
      nombre_completo: normalizarNombreCompleto(datos.nombre_completo),
      dni_cuit: normalizarSoloDigitos(datos.dni_cuit),
      telefono: (datos.telefono ?? '').trim(),
      email: (datos.email ?? '').trim().toLowerCase() || null,
      fecha_nacimiento: esJuridica ? null : (datos.fecha_nacimiento || null),
      estado_civil: esJuridica ? null : (datos.estado_civil ?? '').trim() || null,
      ocupacion: (datos.ocupacion ?? '').trim() || null,
      tipo_garantia: tipoGarantia,
      emergencia_nombre: (datos.emergencia_nombre ?? '').trim() || null,
      emergencia_telefono: (datos.emergencia_telefono ?? '').trim() || null,
      observaciones: (datos.observaciones ?? '').trim() || null,
    },
  }
}

async function verificarDniCuitUnico(dniCuit, excluirId = null) {
  let query = supabase.from('inquilinos').select('id').eq('dni_cuit', dniCuit)

  if (excluirId !== null) {
    query = query.neq('id', excluirId)
  }

  const { data, error } = await query.limit(1)
  if (error) return { error }
  return { existe: (data?.length ?? 0) > 0 }
}

function errorDniCuitDuplicado(error, dniCuit) {
  if (error?.code === '23505') {
    return { message: `Ya existe un inquilino registrado con el DNI/CUIT ${dniCuit}` }
  }
  return error
}

export async function listarInquilinos() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .select(COLUMNAS_INQUILINO)
    .order('nombre_completo')

  return { data, error }
}

export async function crearInquilino(inquilino) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const sanitizado = sanitizarInquilino(inquilino)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  const { existe, error: errVerif } = await verificarDniCuitUnico(sanitizado.datos.dni_cuit)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return {
      data: null,
      error: {
        message: `Ya existe un inquilino registrado con el DNI/CUIT ${sanitizado.datos.dni_cuit}`,
      },
    }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .insert(sanitizado.datos)
    .select(COLUMNAS_INQUILINO)
    .single()

  if (error) {
    return { data: null, error: errorDniCuitDuplicado(error, sanitizado.datos.dni_cuit) }
  }

  return { data, error: null }
}

export async function actualizarInquilino(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const deps = await contarDependenciasInquilino(id)
  if (deps.error) return { data: null, error: deps.error }

  const conContratoActivo = (deps.contratos_activos ?? 0) > 0
  let datosEdit = { ...datos }

  if (conContratoActivo) {
    const { data: actual, error: errActual } = await supabase
      .from('inquilinos')
      .select('tipo_persona, dni_cuit')
      .eq('id', id)
      .single()

    if (errActual) return { data: null, error: errActual }

    datosEdit = {
      ...datosEdit,
      tipo_persona: actual.tipo_persona,
      dni_cuit: actual.dni_cuit,
    }
  }

  const sanitizado = sanitizarInquilino(datosEdit)
  if (sanitizado.error) return { data: null, error: sanitizado.error }

  const { existe, error: errVerif } = await verificarDniCuitUnico(sanitizado.datos.dni_cuit, id)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return {
      data: null,
      error: {
        message: `Ya existe otro inquilino con el DNI/CUIT ${sanitizado.datos.dni_cuit}`,
      },
    }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .update(sanitizado.datos)
    .eq('id', id)
    .select(COLUMNAS_INQUILINO)
    .single()

  if (error) {
    return { data: null, error: errorDniCuitDuplicado(error, sanitizado.datos.dni_cuit) }
  }

  return { data, error: null }
}

export async function contarContratosPorInquilino(inquilinoId) {
  const deps = await contarDependenciasInquilino(inquilinoId)
  if (deps.error) return { error: deps.error }
  return { contratos: deps.contratos_activos }
}

/**
 * Contratos activos, históricos y reclamos asociados a un inquilino.
 */
export async function contarDependenciasInquilino(inquilinoId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const [contratosActivosRes, contratosProgramadosRes, contratosHistoricosRes, reclamosRes] =
    await Promise.all([
      supabase
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .eq('inquilino_id', inquilinoId)
        .eq('estado', 'activo'),
      supabase
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .eq('inquilino_id', inquilinoId)
        .eq('estado', 'programado'),
      supabase
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .eq('inquilino_id', inquilinoId)
        .eq('estado', 'inactivo'),
      supabase
        .from('reclamos')
        .select('id', { count: 'exact', head: true })
        .eq('inquilino_id', inquilinoId),
    ])

  if (contratosActivosRes.error) return { error: contratosActivosRes.error }
  if (contratosProgramadosRes.error) return { error: contratosProgramadosRes.error }
  if (contratosHistoricosRes.error) return { error: contratosHistoricosRes.error }
  if (reclamosRes.error) return { error: reclamosRes.error }

  return {
    contratos_activos: contratosActivosRes.count ?? 0,
    contratos_programados: contratosProgramadosRes.count ?? 0,
    contratos_historicos: contratosHistoricosRes.count ?? 0,
    reclamos: reclamosRes.count ?? 0,
  }
}

export async function eliminarInquilino(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('inquilinos').delete().eq('id', id)

  return { error }
}
