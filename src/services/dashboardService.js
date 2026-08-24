import { supabase } from '../supabaseClient'
import { claveMes, hoyIsoLocal, periodoOperativoInfo } from '../utils/aumentosUi'

const MSG_SUPABASE = 'Supabase no configurado. Revisá el archivo .env'

export async function obtenerDashboardAdmin() {
  if (!supabase) {
    return { data: null, error: { message: MSG_SUPABASE } }
  }

  const [kpisRes, reclamosRes, contratosVencerRes, ingresosRes] = await Promise.all([
    supabase.from('dashboard_admin_kpis').select('*').single(),
    supabase
      .from('reclamos')
      .select(
        `
        id,
        titulo,
        estado,
        fecha_creacion,
        inquilinos ( nombre_completo ),
        propiedades ( direccion )
      `
      )
      .eq('estado', 'Pendiente')
      .order('fecha_creacion', { ascending: false })
      .limit(4),
    supabase
      .from('dashboard_contratos_por_vencer')
      .select('*')
      .order('fecha_fin', { ascending: true })
      .limit(4),
    supabase
      .from('contratos')
      .select('monto_alquiler, fecha_proximo_aumento, fecha_fin')
      .eq('estado', 'activo'),
  ])

  const error =
    kpisRes.error ?? reclamosRes.error ?? contratosVencerRes.error ?? ingresosRes.error

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  const contratosActivos = ingresosRes.data ?? []
  const ingresoMensual = contratosActivos.reduce(
    (sum, row) => sum + (Number(row.monto_alquiler) || 0),
    0
  )

  const periodo = periodoOperativoInfo(hoyIsoLocal())
  const aumentosPeriodo = contratosActivos.filter((row) => {
    const fecha = row.fecha_proximo_aumento
    if (!fecha) return false
    if (row.fecha_fin && fecha > row.fecha_fin) return false
    return claveMes(fecha) === periodo.clave
  }).length

  return {
    data: {
      kpis: kpisRes.data,
      reclamosPendientes: (reclamosRes.data ?? []).map((row) => ({
        reclamo_id: row.id,
        titulo: row.titulo,
        estado: row.estado,
        inquilino_nombre: row.inquilinos?.nombre_completo,
        propiedad_direccion: row.propiedades?.direccion,
      })),
      contratosPorVencer: contratosVencerRes.data ?? [],
      ingresoMensual,
      aumentosPeriodo: {
        cantidad: aumentosPeriodo,
        nombre: periodo.nombre,
        etiqueta: periodo.etiqueta,
      },
    },
    error: null,
  }
}
