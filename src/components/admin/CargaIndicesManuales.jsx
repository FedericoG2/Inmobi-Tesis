import { useState } from 'react'
import Button from '../ui/Button'
import { IconX } from '../icons/Icons'
import { cn, fieldErrorClass, inputClass, labelClass, selectClass } from '../../utils/ui'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function etiquetaIndice(indice) {
  const valor = Number(indice.valor).toLocaleString('es-AR', { maximumFractionDigits: 4 })
  if (indice.tipo === 'ipc') return `IPC ${MESES[indice.mes - 1]} ${indice.anio}: ${valor}%`
  const [y, m, d] = indice.fecha.split('-')
  return `ICL ${d}/${m}/${y}: ${valor}`
}

/**
 * Carga manual de índices (CU-024). Cuando Argly no publica el IPC de un mes o el ICL de un día,
 * se carga acá; si el oficial existe, se sigue usando el oficial. Al guardar se recalculan los
 * aumentos que dependen de ese valor.
 */
export default function CargaIndicesManuales({ indices, onGuardar, onEliminar, disabled }) {
  const [tipo, setTipo] = useState('ipc')
  const [mes, setMes] = useState('')
  const [fecha, setFecha] = useState('')
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const resultado = await onGuardar({ tipo, mes, fecha, valor })
    setGuardando(false)
    if (resultado?.error) {
      setError(resultado.error.message)
      return
    }
    setValor('')
  }

  const eliminar = async (id) => {
    setEliminandoId(id)
    const resultado = await onEliminar(id)
    setEliminandoId(null)
    if (resultado?.error) setError(resultado.error.message)
  }

  return (
    <section className="border-b border-slate-200/80 px-4 py-3 lg:px-5" aria-labelledby="carga-indices-titulo">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="carga-indices-titulo" className="text-sm font-semibold text-slate-900">
          Carga manual de índices
        </h2>
        <p className="text-xs text-slate-500">
          Cuando Argly no publica el mes o el día, cargalo acá. Si el índice oficial ya existe, se sigue usando ese.
        </p>
      </div>
      <form onSubmit={guardar} className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-[8rem_11rem_9rem_auto] sm:items-end sm:justify-start">
        <div>
          <label htmlFor="indice-tipo" className={cn(labelClass, 'text-xs')}>
            Índice
          </label>
          <select id="indice-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass} disabled={disabled}>
            <option value="ipc">IPC</option>
            <option value="icl">ICL</option>
          </select>
        </div>
        {tipo === 'ipc' ? (
          <div>
            <label htmlFor="indice-mes" className={cn(labelClass, 'text-xs')}>
              Mes
            </label>
            <input id="indice-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={inputClass} disabled={disabled} />
          </div>
        ) : (
          <div>
            <label htmlFor="indice-fecha" className={cn(labelClass, 'text-xs')}>
              Fecha
            </label>
            <input id="indice-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} disabled={disabled} />
          </div>
        )}
        <div>
          <label htmlFor="indice-valor" className={cn(labelClass, 'text-xs')}>
            {tipo === 'ipc' ? 'Variación (%)' : 'Valor'}
          </label>
          <input
            id="indice-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={tipo === 'ipc' ? '2,7' : '27,41'}
            className={inputClass}
            disabled={disabled}
          />
        </div>
        <Button type="submit" loading={guardando} disabled={disabled} className="w-full sm:w-auto">
          Guardar índice
        </Button>
      </form>
      {error && <p className={fieldErrorClass}>{error}</p>}
      {indices.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Índices cargados a mano">
          {indices.map((indice) => (
            <li
              key={indice.id}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
            >
              {etiquetaIndice(indice)}
              <button
                type="button"
                onClick={() => eliminar(indice.id)}
                disabled={disabled || eliminandoId === indice.id}
                aria-label={`Quitar ${etiquetaIndice(indice)}`}
                title="Quitar"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                <IconX className="h-3 w-3" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
