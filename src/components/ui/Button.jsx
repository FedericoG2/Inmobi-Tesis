import { buttonClass } from '../../utils/ui'

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z" />
    </svg>
  )
}

/**
 * Botón del sistema. Variantes: primary · secondary · ghost · danger · dangerOutline · warning.
 * Tamaños: sm · md · lg · icon · iconSm.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  type = 'button',
  disabled,
  className = '',
  children,
  ...props
}) {
  const iconSize = size === 'sm' || size === 'iconSm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    >
      {loading ? <Spinner className={iconSize} /> : Icon ? <Icon className={iconSize} strokeWidth={2} /> : null}
      {children}
      {IconRight && !loading ? <IconRight className={iconSize} strokeWidth={2} /> : null}
    </button>
  )
}
