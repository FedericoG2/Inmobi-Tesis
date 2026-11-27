import { supabase } from '../supabaseClient'
import { generarPeriodos } from './alquileresService'
import { CATEGORIA_COMPROBANTE_AUMENTO, CATEGORIA_CONTRATO_LEGAL } from './documentosService'

/*
 * Portal del propietario: solo consultas. La base (RLS) devuelve únicamente sus
 * propiedades, los contratos activos y finalizados de ellas, sus pagos y sus documentos.
 */

const SIN_SUPABASE = { message: 'Supabase no configurado. Revisá el archivo .env' }

export async function obtenerPropietarioPorPerfil(userId) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  return supabase
    .from('propietarios')
    .select('id, nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio')
    .eq('perfil_id', userId)
    .maybeSingle()
}

export async function listarPropiedadesPropietario() {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  return supabase.from('propiedades').select('id, direccion, tipo, estado').order('direccion')
}

/** Contratos de sus propiedades con aumentos, períodos y el nombre del inquilino. */
export async function listarContratosPropietario() {
  if (!supabase) return { data: null, error: SIN_SUPABASE }

  await generarPeriodos()

  const [contratosRes, inquilinosRes] = await Promise.all([
    supabase
      .from('contratos')
      .select(`
        id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial, dia_vencimiento, tipo_ajuste,
        periodicidad_meses, fecha_ultimo_aumento, fecha_proximo_aumento, estado, propiedad_id,
        propiedades ( id, direccion, tipo ),
        aumentos ( id, fecha_aplicacion, monto_anterior, monto_nuevo, porcentaje_aplicado, indice_tipo, modo, notas, detalle_calculo ),
        periodos_alquiler ( id, periodo, estado, monto, fecha_vencimiento )
      `)
      .in('estado', ['activo', 'inactivo'])
      .order('fecha_inicio', { ascending: false })
      .order('fecha_aplicacion', { referencedTable: 'aumentos', ascending: true }),
    supabase.rpc('portal_propietario_inquilinos'),
  ])

  if (contratosRes.error) return { data: null, error: contratosRes.error }
  if (inquilinosRes.error) return { data: null, error: inquilinosRes.error }

  const nombrePorContrato = new Map((inquilinosRes.data ?? []).map((f) => [f.contrato_id, f.inquilino_nombre]))
  return {
    data: (contratosRes.data ?? []).map((c) => ({ ...c, inquilino_nombre: nombrePorContrato.get(c.id) ?? null })),
    error: null,
  }
}

/** Contrato firmado y comprobantes de aumento de un contrato (solo consulta). */
export async function listarDocumentosPropietario(contratoId) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  return supabase
    .from('documentos')
    .select('id, contrato_id, nombre, categoria, url_archivo, fecha_subida')
    .eq('contrato_id', contratoId)
    .in('categoria', [CATEGORIA_CONTRATO_LEGAL, CATEGORIA_COMPROBANTE_AUMENTO])
    .order('fecha_subida', { ascending: false })
}
