import { pageSubtitle, pageTitle } from '../../utils/ui'

export default function AdminModuleHeader({ title, subtitle, titleAction, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className={pageTitle}>{title}</h1>
          {titleAction}
        </div>
        {subtitle && <p className={`${pageSubtitle} max-w-3xl`}>{subtitle}</p>}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
