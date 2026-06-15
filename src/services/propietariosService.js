import { supabase } from '../supabaseClient'
import {
  normalizarNombreCompleto,
  normalizarSoloDigitos,
} from '../utils/normalizarContacto'

const SELECT_PROPIETARIO =
  'id, tipo_persona, nombre_completo, dni_cuit, telefono, email, domicilio'

function sanitizarPropietario(datos) {
  return {
    tipo_persona: datos.tipo_persona === 'Jurídica' ? 'Jurídica' : 'Física',
    nombre_completo: normalizarNombreCompleto(datos.nombre_completo),
    dni_cuit: normalizarSoloDigitos(datos.dni_cuit),
    telefono: normalizarSoloDigitos(datos.telefono),
    email: (datos.email ?? '').trim().toLowerCase(),
    domicilio: (datos.domicilio ?? '').trim() || null,
  }
}

async function verificarDniCuitUnico(dniCuit, excluirId = null) {
  let query = supabase
    .from('propietarios')
    .select('id', { count: 'exact', head: true })
    .eq('dni_cuit', dniCuit)

  if (excluirId !== null) {
    query = query.neq('id', excluirId)
  }

  const { count, error } = await query
  if (error) return { error }
  return { existe: (count ?? 0) > 0 }
}

export async function listarPropietarios() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .select(SELECT_PROPIETARIO)
    .order('nombre_completo')

  return { data, error }
}

export async function crearPropietario(propietario) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const datos = sanitizarPropietario(propietario)

  const { existe, error: errVerif } = await verificarDniCuitUnico(datos.dni_cuit)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return {
      data: null,
      error: { message: `Ya existe un propietario registrado con el DNI/CUIT ${datos.dni_cuit}` },
    }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .insert(datos)
    .select(SELECT_PROPIETARIO)
    .single()

  return { data, error }
}

export async function actualizarPropietario(id, datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const sanitizados = sanitizarPropietario(datos)

  const { existe, error: errVerif } = await verificarDniCuitUnico(sanitizados.dni_cuit, id)
  if (errVerif) return { data: null, error: errVerif }
  if (existe) {
    return {
      data: null,
      error: { message: `Ya existe otro propietario con el DNI/CUIT ${sanitizados.dni_cuit}` },
    }
  }

  const { data, error } = await supabase
    .from('propietarios')
    .update(sanitizados)
    .eq('id', id)
    .select(SELECT_PROPIETARIO)
    .single()

  return { data, error }
}

export async function contarPropiedadesPorPropietario(propietarioId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { count, error } = await supabase
    .from('propiedades')
    .select('id', { count: 'exact', head: true })
    .eq('propietario_id', propietarioId)

  if (error) return { error }

  return { propiedades: count ?? 0 }
}

export async function eliminarPropietario(id) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { error } = await supabase.from('propietarios').delete().eq('id', id)

  return { error }
}
