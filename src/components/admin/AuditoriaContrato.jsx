import { useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { listarAuditoriaContrato } from '../../services/contratosService'
import { cambiosAuditoria, resumenAuditoria, tituloAuditoria } from '../../utils/auditoriaUi'
import { fechaHoraCompleta } from '../../utils/actividadUi'
import { calloutClass } from '../../utils/ui'

const VISIBLES = 6

/** Historial de cambios del contrato (tabla auditoria): quién, cuándo y qué había antes. */
export default function AuditoriaContrato({ contratoId }) {
  const [verTodo, setVerTodo] = useState(false)
  const consulta = useConsulta(contratoId, () => listarAuditoriaContrato(contratoId))
  const registros = consulta.data ?? []

  if (consulta.cargandoPrimeraVez) return <p className="text-sm text-slate-500">Cargando historial de cambios…</p>
  if (consulta.error) return <p className={calloutClass('danger')}>No se pudo cargar el historial de cambios.</p>
  if (registros.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay cambios registrados para este contrato.</p>
  }

  const lista = verTodo ? registros : registros.slice(0, VISIBLES)

  return (
    <div className="space-y-2">
      <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {lista.map((r) => {
          const cambios = cambiosAuditoria(r)
          const resumen = resumenAuditoria(r)
          return (
            <li key={r.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-slate-900">{tituloAuditoria(r)}</p>
                <p className="text-xs tabular-nums text-slate-500">{fechaHoraCompleta(r.creado_en)}</p>
              </div>
              <p className="text-xs text-slate-500">{r.usuario_email ?? 'Proceso automático del sistema'}</p>
              {cambios.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {cambios.map((c) => (
                    <li key={c.campo}>
                      <span className="font-medium text-slate-700">{c.etiqueta}:</span>{' '}
                      <span className="text-slate-400 line-through">{c.antes}</span> → <span>{c.despues}</span>
                    </li>
                  ))}
                </ul>
              )}
              {resumen && <p className="mt-1 text-xs text-slate-600">{resumen}</p>}
            </li>
          )
        })}
      </ol>
      {registros.length > VISIBLES && (
        <button
          type="button"
          onClick={() => setVerTodo((v) => !v)}
          className="text-xs font-medium text-brand-600 hover:text-brand-800"
        >
          {verTodo ? 'Ver menos' : `Ver los ${registros.length} cambios`}
        </button>
      )}
    </div>
  )
}
