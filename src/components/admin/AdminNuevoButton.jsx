import Button from '../ui/Button'
import { IconPlus } from '../icons/Icons'

export default function AdminNuevoButton({ label, onClick, className = '', variant = 'primary', disabled = false }) {
  return (
    <Button
      icon={IconPlus}
      size={variant === 'compact' ? 'sm' : 'md'}
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={label}
      title={label}
    >
      <span className="max-sm:sr-only">{label}</span>
    </Button>
  )
}
