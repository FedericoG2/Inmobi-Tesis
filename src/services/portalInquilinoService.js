import { supabase } from '../supabaseClient'
import { listarDocumentosVisiblesInquilino, obtenerUrlDescargaDocumento, etiquetaTipoArchivo } from './documentosService'

export { etiquetaTipoArchivo }

const SELECT_RECLAMO_PORTAL = `
  id,
  titulo,
  descripcion,
  estado,
  prioridad,
  categoria,
  fecha_creacion,
  propiedad_id,
  inquilino_id,
  propiedades ( direccion )
`

export async function obtenerInquilinoPorPerfil(userId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('inquilinos')
    .select('id, nombre_completo, dni_cuit, telefono, perfil_id')
    .eq('perfil_id', userId)
    .maybeSingle()

  return { data, error }
}

export async function listarContratosActivosInquilino(inquilinoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('contratos')
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      monto_alquiler,
      monto_inicial,
      dia_vencimiento,
      tipo_ajuste,
      periodicidad_meses,
      fecha_proximo_aumento,
      observaciones,
      activo,
      estado,
      propiedad_id,
      propiedades ( id, direccion, tipo ),
      aumentos (
        id,
        fecha_aplicacion,
        monto_anterior,
        monto_nuevo,
        porcentaje_aplicado,
        indice_tipo,
        modo
      )
    `)
    .eq('inquilino_id', inquilinoId)
    .eq('estado', 'activo')
    .order('fecha_inicio', { ascending: false })
    .order('fecha_aplicacion', { foreignTable: 'aumentos', ascending: true })

  return { data, error }
}

export async function listarReclamosInquilino(inquilinoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .select(SELECT_RECLAMO_PORTAL)
    .eq('inquilino_id', inquilinoId)
    .order('fecha_creacion', { ascending: false })

  return { data, error }
}

export async function crearReclamoPortal(datos) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!datos.propiedad_id) {
    return {
      data: null,
      error: { message: 'No tenés un contrato activo. No es posible registrar un reclamo sin contrato vigente.' },
    }
  }

  if (!datos.titulo?.trim()) {
    return { data: null, error: { message: 'El título del reclamo es obligatorio' } }
  }

  if (!datos.descripcion?.trim()) {
    return { data: null, error: { message: 'La descripción del reclamo es obligatoria' } }
  }

  if (!datos.categoria) {
    return { data: null, error: { message: 'Seleccioná una categoría para el reclamo' } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .insert({
      inquilino_id: datos.inquilino_id,
      propiedad_id: datos.propiedad_id,
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      categoria: datos.categoria,
      prioridad: datos.prioridad ?? 'Media',
      estado: 'Pendiente',
    })
    .select(SELECT_RECLAMO_PORTAL)
    .single()

  return { data, error }
}

/**
 * Solo permite modificar el título y descripción de un reclamo propio en estado 'Pendiente'.
 * El filtro `.eq('estado', 'Pendiente')` actúa como segunda capa de seguridad en la BD.
 */
export async function actualizarReclamoPortal(id, datos, inquilinoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!datos.titulo?.trim()) {
    return { data: null, error: { message: 'El título del reclamo es obligatorio' } }
  }

  if (!datos.descripcion?.trim()) {
    return { data: null, error: { message: 'La descripción del reclamo es obligatoria' } }
  }

  if (!datos.categoria) {
    return { data: null, error: { message: 'Seleccioná una categoría para el reclamo' } }
  }

  const { data, error } = await supabase
    .from('reclamos')
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      categoria: datos.categoria,
      prioridad: datos.prioridad ?? 'Media',
    })
    .eq('id', id)
    .eq('inquilino_id', inquilinoId)
    .eq('estado', 'Pendiente')
    .select(SELECT_RECLAMO_PORTAL)
    .maybeSingle()

  if (error) return { data: null, error }

  if (!data) {
    return {
      data: null,
      error: { message: 'No se puede modificar este reclamo. Solo podés editar tus reclamos en estado Pendiente.' },
    }
  }

  return { data, error: null }
}

export async function listarDocumentosPortalContrato(contratoId) {
  return listarDocumentosVisiblesInquilino(contratoId)
}

export async function descargarDocumentoPortal(urlArchivo) {
  return obtenerUrlDescargaDocumento(urlArchivo)
}

export async function obtenerProyeccionAumentoPortal(contratoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!contratoId) {
    return { data: null, error: { message: 'Contrato no especificado' } }
  }

  // Aplica los aumentos acordados cuya fecha ya llegó (respaldo del cron diario)
  // para que el inquilino vea el monto vigente correcto.
  await supabase.rpc('aplicar_aumentos_programados')

  const { data, error } = await supabase.rpc('calcular_proyeccion_aumento_portal', {
    p_contrato_id: contratoId,
  })

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return { data, error: null }
}

/**
 * Verifica la propiedad y el estado antes de eliminar. Actúa como capa de seguridad
 * adicional al filtro del UI que solo muestra el botón en reclamos 'Pendiente'.
 */
export async function eliminarReclamoPortal(id, inquilinoId) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data: reclamo, error: fetchError } = await supabase
    .from('reclamos')
    .select('id, estado, inquilino_id')
    .eq('id', id)
    .eq('inquilino_id', inquilinoId)
    .maybeSingle()

  if (fetchError) return { error: fetchError }

  if (!reclamo) {
    return { error: { message: 'No se encontró el reclamo o no te pertenece.' } }
  }

  if (reclamo.estado !== 'Pendiente') {
    return { error: { message: 'Solo podés eliminar reclamos en estado Pendiente.' } }
  }

  const { error } = await supabase.from('reclamos').delete().eq('id', id)
  return { error }
}
