import { supabase } from '../supabaseClient'

const MSG_SUPABASE = 'Supabase no configurado. Revisá el archivo .env'

export async function obtenerDashboardAdmin() {
  if (!supabase) {
    return { data: null, error: { message: MSG_SUPABASE } }
  }

  const [kpisRes, aumentosRes, vencidosRes, urgentesRes, contratosVencerRes, propEstadoRes, ingresosRes] =
    await Promise.all([
      supabase.from('dashboard_admin_kpis').select('*').single(),
      supabase
        .from('dashboard_admin_aumentos_proximos')
        .select('*')
        .order('fecha_proximo_aumento', { ascending: true })
        .limit(4),
      supabase
        .from('dashboard_admin_aumentos_vencidos')
        .select('*')
        .order('fecha_proximo_aumento', { ascending: true })
        .limit(4),
      supabase
        .from('dashboard_admin_reclamos_urgentes')
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .limit(4),
      supabase
        .from('dashboard_contratos_por_vencer')
        .select('*')
        .order('fecha_fin', { ascending: true })
        .limit(4),
      supabase.from('dashboard_propiedades_por_estado').select('*'),
      supabase.from('contratos').select('monto_alquiler').eq('activo', true),
    ])

  const error =
    kpisRes.error ??
    aumentosRes.error ??
    vencidosRes.error ??
    urgentesRes.error ??
    contratosVencerRes.error ??
    propEstadoRes.error ??
    ingresosRes.error

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  const ingresoMensual = (ingresosRes.data ?? []).reduce(
    (sum, row) => sum + (Number(row.monto_alquiler) || 0),
    0
  )

  return {
    data: {
      kpis: kpisRes.data,
      aumentosProximos: aumentosRes.data ?? [],
      aumentosVencidos: vencidosRes.data ?? [],
      reclamosUrgentes: urgentesRes.data ?? [],
      contratosPorVencer: contratosVencerRes.data ?? [],
      propiedadesPorEstado: propEstadoRes.data ?? [],
      ingresoMensual,
    },
    error: null,
  }
}
