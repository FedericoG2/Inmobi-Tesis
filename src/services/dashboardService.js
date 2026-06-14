import { supabase } from '../supabaseClient'

const MSG_SUPABASE = 'Supabase no configurado. Revisá el archivo .env'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function mapIpcAnual(rows) {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.mes - b.mes)
    .map((row) => ({
      mes: MESES_CORTOS[row.mes - 1] ?? String(row.mes),
      valor: Number(row.valor),
    }))
}

export async function obtenerDashboardAdmin() {
  if (!supabase) {
    return { data: null, error: { message: MSG_SUPABASE } }
  }

  const [kpisRes, aumentosRes, urgentesRes, ipcRes] = await Promise.all([
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
    supabase.from('dashboard_ipc_anual').select('anio, mes, valor').order('mes', { ascending: true }),
  ])

  const error = kpisRes.error ?? aumentosRes.error ?? urgentesRes.error ?? ipcRes.error

  if (error) {
    return { data: null, error: { message: error.message } }
  }

  return {
    data: {
      kpis: kpisRes.data,
      aumentosProximos: aumentosRes.data ?? [],
      reclamosUrgentes: urgentesRes.data ?? [],
      ipcAnual: mapIpcAnual(ipcRes.data),
      ipcAnio: ipcRes.data?.[0]?.anio ?? new Date().getFullYear(),
    },
    error: null,
  }
}
