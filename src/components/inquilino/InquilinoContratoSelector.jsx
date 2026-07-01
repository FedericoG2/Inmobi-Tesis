import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'

export default function InquilinoContratoSelector({ variant = 'mobile', className = '' }) {
  const { contratos, contratoSeleccionadoId, setContratoSeleccionado, loading } = usePortalInquilino()

  if (loading || contratos.length <= 1) return null

  const selectClass =
    variant === 'desktop'
      ? 'h-10 min-w-[14rem] max-w-md cursor-pointer rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
      : 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

  if (variant === 'desktop') {
    return (
      <div className={`hidden shrink-0 lg:block ${className}`.trim()}>
        <label htmlFor="contrato-activo-portal-desktop" className="sr-only">
          Contrato activo
        </label>
        <select
          id="contrato-activo-portal-desktop"
          value={contratoSeleccionadoId ?? ''}
          onChange={(e) => setContratoSeleccionado(e.target.value)}
          className={selectClass}
        >
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.propiedades?.direccion ?? `Contrato #${c.id}`}
              {c.propiedades?.tipo ? ` · ${c.propiedades.tipo}` : ''}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className={className}>
      <label htmlFor="contrato-activo-portal" className="mb-1.5 block text-xs font-medium text-slate-500">
        Contrato activo
      </label>
      <select
        id="contrato-activo-portal"
        value={contratoSeleccionadoId ?? ''}
        onChange={(e) => setContratoSeleccionado(e.target.value)}
        className={selectClass}
      >
        {contratos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.propiedades?.direccion ?? `Contrato #${c.id}`}
            {c.propiedades?.tipo ? ` · ${c.propiedades.tipo}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
