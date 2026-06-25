import { supabase } from '../supabaseClient'

export const BUCKET_CONTRATOS = 'contratos'
export const CATEGORIA_CONTRATO_LEGAL = 'Contrato Firmado'
export const CATEGORIA_COMPROBANTE_AUMENTO = 'Comprobante de Aumento'

const COLUMNAS_DOCUMENTO = `
  id,
  contrato_id,
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
