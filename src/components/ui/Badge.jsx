import { badgeClass, cn, dotTones } from '../../utils/ui'

/** Pill de estado. Tonos: brand · neutral · muted · success · warning · danger. */
export default function Badge({ tone = 'neutral', dot = false, icon: Icon, className = '', title, children }) {
  return (
    <span className={badgeClass(tone, className)} title={title}>
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone] ?? dotTones.neutral)} aria-hidden /> : null}
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  )
}
