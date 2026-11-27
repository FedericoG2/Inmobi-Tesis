import { supabase } from '../supabaseClient'
import { extensionArchivo, sanitizarNombreArchivo } from './documentosService'

/*
 * Módulo de Alquileres: períodos de alquiler (uno por mes de cada contrato) y comprobantes
 * de pago. La base valida todas las reglas; acá se arman las consultas y se traducen los
 * errores a mensajes para la pantalla.
 */

export const BUCKET_COMPROBANTES = 'comprobantes-pago'

const SIN_SUPABASE = { message: 'Supabase no configurado. Revisá el archivo .env' }

const COLUMNAS_COMPROBANTE =
  'id, periodo_id, contrato_id, nombre, url_archivo, monto, fecha_pago, observaciones, cargado_por, fecha_subida'

const COLUMNAS_PERIODO = `
  id, contrato_id, periodo, fecha_vencimiento, monto, estado, fecha_confirmacion,
  comprobantes_pago ( ${COLUMNAS_COMPROBANTE} )
`

const EXTENSIONES_COMPROBANTE = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
const MIME_COMPROBANTE = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
export const MAX_BYTES_COMPROBANTE = 10 * 1024 * 1024
export const ACEPTA_COMPROBANTE = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

/** Ordena los períodos del más reciente al más antiguo, y sus comprobantes igual. */
function ordenarPeriodos(periodos) {
  return [...(periodos ?? [])]
    .sort((a, b) => b.periodo.localeCompare(a.periodo))
    .map((p) => ({
      ...p,
      comprobantes_pago: [...(p.comprobantes_pago ?? [])].sort((a, b) => b.fecha_subida.localeCompare(a.fecha_subida)),
    }))
}

/**
 * Crea los períodos que falten hasta el mes en curso (o hasta `hasta`, si el Encargado elige un
 * mes posterior). La base solo genera los de los contratos que el usuario puede ver; se llama
 * antes de cada consulta (además de la tarea diaria), así nunca falta el mes actual.
 */
export async function generarPeriodos(contratoId = null, hasta = null) {
  if (!supabase) return { error: SIN_SUPABASE }
  const { error } = await supabase.rpc('generar_periodos_alquiler', { p_contrato_id: contratoId, p_hasta: hasta })
  return { error }
}

/**
 * Alquileres de un mes (Encargado, CU-013): un renglón por período, con el contrato, el inquilino,
 * el inmueble y el propietario. `mes` es el primer día del mes (YYYY-MM-01).
 */
export async function listarAlquileresDelMes(mes) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }

  await generarPeriodos(null, mes)

  const { data, error } = await supabase
    .from('periodos_alquiler')
    .select(`
      id, contrato_id, periodo, fecha_vencimiento, monto, estado, fecha_confirmacion,
      comprobantes_pago ( id ),
      contratos (
        id, estado, motivo_cierre, fecha_inicio, fecha_fin, monto_inicial, monto_alquiler, dia_vencimiento, fecha_proximo_aumento,
        inquilinos ( id, nombre_completo ),
        propiedades ( id, direccion, propietarios ( id, nombre_completo ) )
      )
    `)
    .eq('periodo', mes)

  return { data: data ?? null, error }
}

/** Períodos de un contrato con sus comprobantes (los tres roles, según lo que permite la base). */
export async function listarPeriodosContrato(contratoId) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  if (!contratoId) return { data: [], error: null }

  await generarPeriodos(contratoId)

  const { data, error } = await supabase
    .from('periodos_alquiler')
    .select(COLUMNAS_PERIODO)
    .eq('contrato_id', contratoId)
    .order('periodo', { ascending: false })

  if (error) return { data: null, error }
  return { data: ordenarPeriodos(data), error: null }
}

export function validarArchivoComprobante(archivo) {
  if (!archivo) return { error: { message: 'Elegí el archivo del comprobante (PDF o imagen)' } }
  if (!EXTENSIONES_COMPROBANTE.includes(extensionArchivo(archivo.name))) {
    return { error: { message: 'El comprobante tiene que ser un PDF o una imagen JPG, PNG o WEBP' } }
  }
  if (archivo.type && !MIME_COMPROBANTE.has(archivo.type)) {
    return { error: { message: 'El tipo de archivo no es válido. Usá PDF, JPG, PNG o WEBP.' } }
  }
  if (archivo.size > MAX_BYTES_COMPROBANTE) {
    return { error: { message: 'El comprobante no puede superar 10 MB' } }
  }
  return { ok: true }
}

const MENSAJE_PERIODO_NO_DISPONIBLE =
  'No se pudo registrar el comprobante: el período ya no está pendiente o el contrato no está activo. Actualizá la pantalla.'

function mensajeError(error, porDefecto) {
  const texto = error?.message ?? ''
  if (/row-level security|violates row-level/i.test(texto)) return MENSAJE_PERIODO_NO_DISPONIBLE
  return texto || porDefecto
}

/**
 * Registra un comprobante para un período Pendiente: sube el archivo y crea la fila.
 * Registrarlo no confirma el pago: eso lo hace el Encargado de Alquileres.
 */
export async function registrarComprobantePago({ periodoId, archivo, monto, fechaPago, observaciones }) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }

  const validacion = validarArchivoComprobante(archivo)
  if (validacion.error) return { data: null, error: validacion.error }

  const montoNumero = monto === '' || monto == null ? null : Number(monto)
  if (montoNumero != null && (!Number.isFinite(montoNumero) || montoNumero <= 0)) {
    return { data: null, error: { message: 'El monto pagado tiene que ser mayor a cero' } }
  }

  const ruta = `${periodoId}/${Date.now()}-${sanitizarNombreArchivo(archivo.name)}`
  const { error: errorSubida } = await supabase.storage.from(BUCKET_COMPROBANTES).upload(ruta, archivo, {
    cacheControl: '3600',
    upsert: false,
    contentType: archivo.type || undefined,
  })
  if (errorSubida) {
    return { data: null, error: { message: mensajeError(errorSubida, 'No se pudo subir el archivo') } }
  }

  const { data, error } = await supabase
    .from('comprobantes_pago')
    .insert({
      periodo_id: Number(periodoId),
      nombre: archivo.name,
      url_archivo: ruta,
      monto: montoNumero,
      fecha_pago: fechaPago || null,
      observaciones: observaciones?.trim() || null,
    })
    .select(COLUMNAS_COMPROBANTE)
    .single()

  if (error) {
    // El archivo quedó sin registrar: la base permite borrarlo a quien lo subió.
    await supabase.storage.from(BUCKET_COMPROBANTES).remove([ruta])
    return { data: null, error: { message: mensajeError(error, 'No se pudo registrar el comprobante') } }
  }

  return { data, error: null }
}

export async function confirmarPagoPeriodo(periodoId) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  const { data, error } = await supabase.rpc('confirmar_pago_periodo', { p_periodo_id: periodoId })
  return { data, error: error ? { message: mensajeError(error, 'No se pudo confirmar el pago') } : null }
}

export async function deshacerPagoPeriodo(periodoId) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  const { data, error } = await supabase.rpc('deshacer_pago_periodo', { p_periodo_id: periodoId })
  return { data, error: error ? { message: mensajeError(error, 'No se pudo deshacer la confirmación') } : null }
}

/** Enlace temporal para ver o descargar el archivo de un comprobante. */
export async function obtenerUrlComprobantePago(ruta, expiresIn = 3600) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  return supabase.storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, expiresIn)
}
