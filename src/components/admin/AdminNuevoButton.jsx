import { Button } from '@tremor/react'

export default function AdminNuevoButton({ label, onClick }) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      className="!px-3 !py-1.5 text-xs font-semibold uppercase tracking-wide"
    >
      {label}
    </Button>
  )
}
