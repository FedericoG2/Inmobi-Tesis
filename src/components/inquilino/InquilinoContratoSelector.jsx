import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { IconChevronDown } from '../icons/Icons'
import { cn, selectClass } from '../../utils/ui'

function etiquetaContrato(c) {
  const direccion = c.propiedades?.direccion ?? `Contrato #${c.id}`
  const tipo = c.propiedades?.tipo ? ` · ${c.propiedades.tipo}` : ''
  const finalizado = c.estado === 'activo' ? '' : ' (finalizado)'
  return `${direccion}${tipo}${finalizado}`
}

function OpcionesContrato({ contratos }) {
  return contratos.map((c) => (
    <option key={c.id} value={c.id}>
      {etiquetaContrato(c)}
    </option>
  ))
}

export default function InquilinoContratoSelector({ variant = 'mobile', className = '' }) {
  const { contratos, contratoSeleccionadoId, setContratoSeleccionado, loading } = usePortalInquilino()

  if (loading || contratos.length <= 1) return null

  const esDesktop = variant === 'desktop'
  const id = esDesktop ? 'contrato-activo-portal-desktop' : 'contrato-activo-portal'

  return (
    <div className={cn(esDesktop && 'hidden shrink-0 lg:flex lg:items-center lg:gap-3', className)}>
      <label
        htmlFor={id}
        className={esDesktop ? 'shrink-0 text-sm text-slate-500' : 'mb-1.5 block text-xs font-medium text-slate-500'}
      >
        Contrato
      </label>
      <div className={cn('relative', esDesktop && 'min-w-[14rem] max-w-md flex-1')}>
        <select
          id={id}
          value={contratoSeleccionadoId ?? ''}
          onChange={(e) => setContratoSeleccionado(e.target.value)}
          className={cn(selectClass, esDesktop && 'h-9')}
        >
          <OpcionesContrato contratos={contratos} />
        </select>
        <IconChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
        />
      </div>
    </div>
  )
}
