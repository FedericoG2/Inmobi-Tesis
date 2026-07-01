import { portalPageHeader, portalPageSubtitle, portalPageTitle } from '../../utils/portalInquilinoUi'

export default function PortalPageHeader({ title, subtitle, action }) {
  return (
    <div className={portalPageHeader}>
      <div className="min-w-0">
        <h1 className={portalPageTitle}>{title}</h1>
        {subtitle ? <p className={portalPageSubtitle}>{subtitle}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  )
}
