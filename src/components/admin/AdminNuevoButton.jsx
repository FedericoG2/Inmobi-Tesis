import { Button } from '@tremor/react'

export default function AdminNuevoButton({ label, onClick, className = '' }) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      className={`!px-3 !py-1.5 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </Button>
  )
}
