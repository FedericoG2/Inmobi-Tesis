import Button from '../ui/Button'
import { IconChevronLeft, IconChevronRight } from '../icons/Icons'

export default function AdminTablePagination({
  pagina,
  totalPaginas,
  totalItems,
  itemsPorPagina,
  onPaginaChange,
}) {
  if (totalItems === 0) return null

  const inicio = (pagina - 1) * itemsPorPagina + 1
  const fin = Math.min(pagina * itemsPorPagina, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Mostrando <span className="font-medium tabular-nums text-slate-900">{inicio}–{fin}</span> de{' '}
        <span className="font-medium tabular-nums text-slate-900">{totalItems}</span>
      </p>

      <div className="flex items-center gap-2">
        <span className="mr-1 text-sm tabular-nums text-slate-500">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={IconChevronLeft}
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconRight={IconChevronRight}
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
