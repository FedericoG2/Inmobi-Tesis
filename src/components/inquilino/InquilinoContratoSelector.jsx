import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'

export default function InquilinoContratoSelector() {
  const { contratos, contratoSeleccionadoId, setContratoSeleccionado, loading } = usePortalInquilino()

  if (loading || contratos.length <= 1) return null

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-3">
      <label htmlFor="contrato-activo-portal" className="mb-1.5 block text-xs font-medium text-slate-500">
        Contrato activo
      </label>
      <select
        id="contrato-activo-portal"
        value={contratoSeleccionadoId ?? ''}
        onChange={(e) => setContratoSeleccionado(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
