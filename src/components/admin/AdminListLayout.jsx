import { Card } from '@tremor/react'
import AdminModuleHeader from './AdminModuleHeader'
import AdminNuevoButton from './AdminNuevoButton'

export default function AdminListLayout({
  title,
  subtitle,
  titleAction,
  actionLabel,
  onAction,
  alerts,
  summary,
  children,
}) {
  return (
    <div>
      <AdminModuleHeader title={title} subtitle={subtitle} titleAction={titleAction} />

      {alerts && <div className="mt-4">{alerts}</div>}

      {summary && <div className="mt-8">{summary}</div>}

      {actionLabel && onAction && (
        <div className="mt-8 flex justify-end">
          <AdminNuevoButton label={actionLabel} onClick={onAction} />
        </div>
      )}

      <Card className="mt-8 overflow-hidden border-slate-200 p-0 shadow-sm ring-1 ring-slate-100">
        {children}
      </Card>
    </div>
  )
}
