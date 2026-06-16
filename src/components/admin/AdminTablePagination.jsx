function IconChevronLeft({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function IconChevronRight({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

const btnNav =
  'inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'

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
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Mostrando <span className="font-medium text-slate-700">{inicio}-{fin}</span> de{' '}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnNav}
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
          aria-label="Página anterior"
        >
          <IconChevronLeft />
          Anterior
        </button>

        <span className="min-w-[7rem] text-center text-sm text-slate-600">
          Página {pagina} de {totalPaginas}
        </span>

        <button
          type="button"
          className={btnNav}
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <IconChevronRight />
        </button>
      </div>
    </div>
  )
}
