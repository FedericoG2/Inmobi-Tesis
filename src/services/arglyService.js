import { supabase } from '../supabaseClient'

async function invokeSyncIcl(body) {
  return supabase.functions.invoke('sync-argly-icl', { body })
}

async function parseInvokeError(error) {
  let message = error.message ?? 'Error al sincronizar ICL con Argly'
  if (error.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json()
      if (payload?.error) message = payload.error
    } catch {
      // respuesta no JSON
    }
  }
  return message
}

export async function syncIndices({ incluirProximos = false, diasProximos = 30 } = {}) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const body = { incluir_proximos: incluirProximos, dias_proximos: diasProximos }

  let { data, error } = await invokeSyncIcl(body)

  if (error) {
    ;({ data, error } = await invokeSyncIcl(body))
  }

  if (error) {
    return { data: null, error: { message: await parseInvokeError(error) } }
  }

  if (data?.error) {
    return { data: null, error: { message: data.error } }
  }

  return { data, error: null }
}

/** @deprecated alias */
export const syncIcl = syncIndices
