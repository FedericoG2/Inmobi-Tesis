import Tooltip from '../ui/Tooltip'
import { IconInfo } from '../icons/Icons'
import { cn } from '../../utils/ui'

function Seccion({ titulo, children }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{titulo}</p>
      {children}
    </div>
  )
}

function Filas({ filas }) {
  return (
    <dl className="divide-y divide-slate-100">
      {filas.map((f, i) => (
        <div
          key={`${f.etiqueta}-${i}`}
          className={cn('flex items-baseline justify-between gap-4 py-1', f.destacado && 'border-t border-slate-200 font-semibold text-slate-900')}
        >
          <dt className="min-w-0">
            {f.etiqueta}
            {f.nota && <span className="ml-1 text-slate-400">· {f.nota}</span>}
          </dt>
          <dd className="shrink-0 text-right tabular-nums">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Cálculo completo de un aumento: índices, fórmula, pasos hasta el monto nuevo y fuente. */
export function TrazaAumento({ explicacion, sinTitulo = false }) {
  if (!explicacion) return <p className="text-slate-500">No hay detalle del cálculo para este aumento.</p>
  return (
    <div>
      {!sinTitulo && (
        <div className="mb-2">
          <p className="text-[13px] font-semibold text-slate-900">{explicacion.titulo}</p>
          <p className="text-slate-500">Período del cálculo: {explicacion.periodo}</p>
        </div>
      )}
      {explicacion.indices.length > 0 && (
        <Seccion titulo="Índices usados">
          <Filas filas={explicacion.indices} />
        </Seccion>
      )}
      {explicacion.formula && (
        <Seccion titulo={explicacion.etiquetaMultiplicador}>
          <p className="rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-slate-700">
            {explicacion.formula}
          </p>
        </Seccion>
      )}
      <Seccion titulo="Cálculo">
        <Filas filas={explicacion.pasos} />
      </Seccion>
      {explicacion.fuente && <p className="mt-2 text-slate-500">Fuente: {explicacion.fuente}.</p>}
      {explicacion.notas && <p className="mt-1 text-slate-600">Observación: “{explicacion.notas}”</p>}
      {explicacion.avisos.map((a) => (
        <p key={a} className="mt-1 text-amber-800">
          {a}
        </p>
      ))}
    </div>
  )
}

/** Origen de un monto (período o contrato), con el cálculo del aumento que lo fijó si lo hay. */
export function TrazaMonto({ explicacion }) {
  if (!explicacion) return null
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-slate-900">{explicacion.titulo}</p>
      <Filas filas={explicacion.lineas} />
      {explicacion.resumen && <p className="mt-2 text-slate-500">{explicacion.resumen}</p>}
      {explicacion.aviso && <p className="mt-2 text-amber-800">{explicacion.aviso}</p>}
      {explicacion.aumento && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <TrazaAumento explicacion={explicacion.aumento} />
        </div>
      )}
    </div>
  )
}

/**
 * Monto con su trazabilidad: subrayado punteado y un ícono de información que abre el cálculo.
 * `contenido` es una función que devuelve el cuerpo del tooltip (se arma al abrirlo).
 */
export function MontoTrazable({ children, contenido, etiqueta = 'Ver cómo se calculó este monto', className = '' }) {
  if (!contenido) return <span className={className}>{children}</span>
  return (
    <Tooltip contenido={contenido} etiqueta={etiqueta} className={cn('gap-1', className)}>
      <span className="underline decoration-slate-300 decoration-dotted underline-offset-4">{children}</span>
      <IconInfo className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
    </Tooltip>
  )
}
