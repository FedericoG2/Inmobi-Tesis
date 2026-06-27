import { supabase } from '../supabaseClient'

export const BUCKET_CONTRATOS = 'contratos'
export const CATEGORIA_CONTRATO_LEGAL = 'Contrato Firmado'
export const CATEGORIA_COMPROBANTE_AUMENTO = 'Comprobante de Aumento'
export const CATEGORIA_ADJUNTO_RECLAMO = 'Adjunto de Reclamo'

const COLUMNAS_DOCUMENTO = `
  id,
  contrato_id,
  reclamo_id,
  aumento_id,
  propiedad_id,
  nombre,
  categoria,
  url_archivo,
  visible_para_inquilino,
  fecha_subida
`

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const EXTENSIONES_PERMITIDAS = ['.pdf', '.doc', '.docx']
const MAX_BYTES = 15 * 1024 * 1024

const MIME_IMAGEN_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const EXTENSIONES_IMAGEN_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const MAX_BYTES_IMAGEN = 10 * 1024 * 1024

function extensionArchivo(nombre) {
  const idx = nombre.lastIndexOf('.')
  if (idx < 0) return ''
  return nombre.slice(idx).toLowerCase()
}

function sanitizarNombreArchivo(nombre) {
  return (nombre ?? 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'documento'
}

export function validarArchivoContratoLegal(archivo) {
  if (!archivo) {
    return { error: { message: 'Seleccioná un archivo PDF o Word' } }
  }

  const ext = extensionArchivo(archivo.name)
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
    return { error: { message: 'Solo se permiten archivos PDF, DOC o DOCX' } }
  }

  if (!MIME_PERMITIDOS.has(archivo.type) && archivo.type !== '') {
    return { error: { message: 'El tipo de archivo no es válido. Usá PDF o Word.' } }
  }

  if (archivo.size > MAX_BYTES) {
    return { error: { message: 'El archivo no puede superar 15 MB' } }
  }

  return { ok: true }
}

export async function listarDocumentosContrato(contratoId, { categoria = CATEGORIA_CONTRATO_LEGAL } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  let query = supabase
    .from('documentos')
    .select(COLUMNAS_DOCUMENTO)
    .eq('contrato_id', contratoId)
    .order('fecha_subida', { ascending: false })

  if (categoria) {
    query = query.eq('categoria', categoria)
  }

  const { data, error } = await query
  return { data, error }
}

export async function listarDocumentosVisiblesInquilino(contratoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .select(COLUMNAS_DOCUMENTO)
    .eq('contrato_id', contratoId)
    .eq('visible_para_inquilino', true)
    .order('fecha_subida', { ascending: false })

  return { data, error }
}

export async function subirDocumentoContrato({
  contratoId,
  propiedadId,
  archivo,
  visibleParaInquilino = true,
  categoria = CATEGORIA_CONTRATO_LEGAL,
}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const validacion = validarArchivoContratoLegal(archivo)
  if (validacion.error) return { data: null, error: validacion.error }

  const nombreSeguro = sanitizarNombreArchivo(archivo.name)
  const storagePath = `${contratoId}/${Date.now()}-${nombreSeguro}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .upload(storagePath, archivo, {
      cacheControl: '3600',
      upsert: false,
      contentType: archivo.type || undefined,
    })

  if (uploadError) {
    return { data: null, error: { message: uploadError.message ?? 'No se pudo subir el archivo' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      contrato_id: Number(contratoId),
      propiedad_id: Number(propiedadId),
      nombre: archivo.name,
      categoria,
      url_archivo: storagePath,
      visible_para_inquilino: Boolean(visibleParaInquilino),
    })
    .select(COLUMNAS_DOCUMENTO)
    .single()

  if (error) {
    await supabase.storage.from(BUCKET_CONTRATOS).remove([storagePath])
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Sube un comprobante de aumento (PDF generado) y lo registra como documento
 * del contrato, visible para el inquilino.
 */
export async function subirComprobanteAumento({
  contratoId,
  propiedadId,
  aumentoId = null,
  blob,
  filename,
  nombre,
  visibleParaInquilino = true,
}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!blob || !contratoId || !propiedadId) {
    return { data: null, error: { message: 'Faltan datos para subir el comprobante' } }
  }

  const nombreArchivo = sanitizarNombreArchivo(filename ?? 'comprobante-aumento.pdf')
  const storagePath = `${contratoId}/${Date.now()}-${nombreArchivo}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    })

  if (uploadError) {
    return { data: null, error: { message: uploadError.message ?? 'No se pudo subir el comprobante' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      contrato_id: Number(contratoId),
      propiedad_id: Number(propiedadId),
      aumento_id: aumentoId != null ? Number(aumentoId) : null,
      nombre: nombre ?? 'Comprobante de aumento',
      categoria: CATEGORIA_COMPROBANTE_AUMENTO,
      url_archivo: storagePath,
      visible_para_inquilino: Boolean(visibleParaInquilino),
    })
    .select(COLUMNAS_DOCUMENTO)
    .single()

  if (error) {
    await supabase.storage.from(BUCKET_CONTRATOS).remove([storagePath])
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Busca el comprobante PDF de un aumento. Prioriza el vínculo directo
 * (aumento_id) y cae a un match por contrato + período del archivo para
 * comprobantes generados antes de existir la columna aumento_id.
 */
export async function obtenerComprobanteAumento({ aumentoId, contratoId, fechaAplicacion } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (aumentoId != null) {
    const { data, error } = await supabase
      .from('documentos')
      .select(COLUMNAS_DOCUMENTO)
      .eq('aumento_id', Number(aumentoId))
      .order('fecha_subida', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    if (data) return { data, error: null }
  }

  // Fallback por período del archivo: cubre el detalle (que no conoce el id del
  // aumento) y comprobantes históricos generados antes de existir aumento_id.
  if (contratoId != null && fechaAplicacion) {
    const periodo = String(fechaAplicacion).slice(0, 7) // YYYY-MM
    const { data, error } = await supabase
      .from('documentos')
      .select(COLUMNAS_DOCUMENTO)
      .eq('contrato_id', Number(contratoId))
      .eq('categoria', CATEGORIA_COMPROBANTE_AUMENTO)
      .ilike('nombre', `%${periodo}%`)
      .order('fecha_subida', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    if (data) return { data, error: null }
  }

  return { data: null, error: null }
}

/** Elimina el comprobante PDF de un aumento (storage + fila documento), si existe. */
export async function eliminarComprobanteAumento({ aumentoId, contratoId, fechaAplicacion } = {}) {
  const { data: documento, error } = await obtenerComprobanteAumento({
    aumentoId,
    contratoId,
    fechaAplicacion,
  })

  if (error) return { error }
  if (!documento) return { error: null }

  return eliminarDocumentoContrato(documento)
}

export async function actualizarVisibilidadDocumento(id, visibleParaInquilino) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .update({ visible_para_inquilino: Boolean(visibleParaInquilino) })
    .eq('id', id)
    .select(COLUMNAS_DOCUMENTO)
    .single()

  return { data, error }
}

export async function eliminarDocumentoContrato(documento) {
  if (!supabase) {
    return { error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!documento?.id || !documento?.url_archivo) {
    return { error: { message: 'Documento inválido' } }
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .remove([documento.url_archivo])

  if (storageError) {
    return { error: { message: storageError.message ?? 'No se pudo eliminar el archivo' } }
  }

  const { error } = await supabase.from('documentos').delete().eq('id', documento.id)
  return { error }
}

export async function obtenerUrlDescargaDocumento(storagePath, expiresIn = 3600) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .createSignedUrl(storagePath, expiresIn)

  return { data, error }
}

export function etiquetaTipoArchivo(nombre) {
  const ext = extensionArchivo(nombre)
  if (ext === '.pdf') return 'PDF'
  if (ext === '.doc' || ext === '.docx') return 'Word'
  return ext.replace('.', '').toUpperCase() || 'Archivo'
}

export function validarImagenReclamo(archivo) {
  if (!archivo) {
    return { error: { message: 'Seleccioná una imagen (JPG, PNG, WEBP o GIF)' } }
  }

  const ext = extensionArchivo(archivo.name)
  if (!EXTENSIONES_IMAGEN_PERMITIDAS.includes(ext)) {
    return { error: { message: 'Solo se permiten imágenes JPG, PNG, WEBP o GIF' } }
  }

  if (!MIME_IMAGEN_PERMITIDOS.has(archivo.type) && archivo.type !== '') {
    return { error: { message: 'El tipo de archivo no es una imagen válida' } }
  }

  if (archivo.size > MAX_BYTES_IMAGEN) {
    return { error: { message: 'La imagen no puede superar 10 MB' } }
  }

  return { ok: true }
}

export async function listarAdjuntosReclamo(reclamoId) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .select(COLUMNAS_DOCUMENTO)
    .eq('reclamo_id', reclamoId)
    .order('fecha_subida', { ascending: false })

  return { data, error }
}

export async function subirAdjuntoReclamo({
  reclamoId,
  propiedadId,
  archivo,
  visibleParaInquilino = false,
}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  if (!reclamoId || !propiedadId) {
    return { data: null, error: { message: 'Faltan datos del reclamo para adjuntar' } }
  }

  const validacion = validarImagenReclamo(archivo)
  if (validacion.error) return { data: null, error: validacion.error }

  const nombreSeguro = sanitizarNombreArchivo(archivo.name)
  const storagePath = `reclamos/${reclamoId}/${Date.now()}-${nombreSeguro}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .upload(storagePath, archivo, {
      cacheControl: '3600',
      upsert: false,
      contentType: archivo.type || undefined,
    })

  if (uploadError) {
    return { data: null, error: { message: uploadError.message ?? 'No se pudo subir la imagen' } }
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      reclamo_id: Number(reclamoId),
      propiedad_id: Number(propiedadId),
      nombre: archivo.name,
      categoria: CATEGORIA_ADJUNTO_RECLAMO,
      url_archivo: storagePath,
      visible_para_inquilino: Boolean(visibleParaInquilino),
    })
    .select(COLUMNAS_DOCUMENTO)
    .single()

  if (error) {
    await supabase.storage.from(BUCKET_CONTRATOS).remove([storagePath])
    return { data: null, error }
  }

  return { data, error: null }
}
