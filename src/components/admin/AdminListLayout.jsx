import AdminModuleHeader from './AdminModuleHeader'
import AdminNuevoButton from './AdminNuevoButton'
import { surfaceCard } from '../../utils/ui'

export default function AdminListLayout({
  title,
  subtitle,
  titleAction,
  actions,
  actionLabel,
  onAction,
  alerts,
  summary,
  children,
}) {
  const accionesHeader =
    actions ?? (actionLabel && onAction ? <AdminNuevoButton label={actionLabel} onClick={onAction} /> : null)

  return (
    <div className="space-y-5">
      <AdminModuleHeader title={title} subtitle={subtitle} titleAction={titleAction} actions={accionesHeader} />

      {alerts && <div>{alerts}</div>}

      {summary && <div>{summary}</div>}

      <div className={`${surfaceCard} overflow-hidden`}>{children}</div>
    </div>
  )
}
