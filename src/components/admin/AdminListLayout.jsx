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
  compact = false,
}) {
  const gapPrincipal = compact ? 'mt-4' : 'mt-8'

  return (
    <div>
      <AdminModuleHeader title={title} subtitle={subtitle} titleAction={titleAction} />

      {alerts && <div className={compact ? 'mt-3' : 'mt-4'}>{alerts}</div>}

      {summary && <div className={gapPrincipal}>{summary}</div>}

      {actionLabel && onAction && (
        <div className={`${gapPrincipal} flex justify-end`}>
          <AdminNuevoButton label={actionLabel} onClick={onAction} />
        </div>
      )}

      <Card className={`${gapPrincipal} overflow-hidden border-slate-200 p-0 shadow-sm ring-1 ring-slate-100`}>
        {children}
      </Card>
    </div>
  )
}
