import { portalCardClass, portalInfoGroupTitle, portalInfoLabel, portalInfoRow, portalInfoValue } from '../../utils/portalInquilinoUi'

export function PortalInfoGroup({ titulo, children }) {
  return (
    <div>
      <p className={portalInfoGroupTitle}>{titulo}</p>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </div>
  )
}

export function PortalInfoRow({ label, value }) {
  return (
    <li className={portalInfoRow}>
      <span className={portalInfoLabel}>{label}</span>
      <span className={portalInfoValue}>{value ?? '—'}</span>
    </li>
  )
}

export function PortalInfoCard({ titulo, children, className = '' }) {
  return (
    <div className={`${portalCardClass} overflow-hidden ${className}`.trim()}>
      {titulo ? (
        <div className="border-b border-slate-100 px-4 py-3 lg:px-5">
          <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        </div>
      ) : null}
      {children}
    </div>
  )
}
