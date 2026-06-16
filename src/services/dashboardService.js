import { supabase } from '../supabaseClient'

const MSG_SUPABASE = 'Supabase no configurado. Revisá el archivo .env'

export async function obtenerDashboardAdmin() {
  if (!supabase) {
    return { data: null, error: { message: MSG_SUPABASE } }
  }

  const [kpisRes, aumentosRes, urgentesRes] = await Promise.all([
    supabase.from('dashboard_admin_kpis').select('*').single(),
    supabase
      .from('dashboard_admin_aumentos_proximos')
      .select('*')
      .order('fecha_proximo_aumento', { ascending: true })
      .limit(5),
    supabase
      .from('dashboard_admin_reclamos_urgentes')
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .limit(5),
  ])

  const error = kpisRes.error ?? aumentosRes.error ?? urgentesRes.error

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return {
    data: {
      kpis: kpisRes.data,
      aumentosProximos: aumentosRes.data ?? [],
      reclamosUrgentes: urgentesRes.data ?? [],
    },
    error: null,
  }
}
