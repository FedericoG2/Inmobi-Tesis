import { useLayoutEffect, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react'
import { cn } from '../../utils/ui'

const cellPadding = 'px-4 first:pl-5 last:pr-5'

/** Barra de búsqueda y filtros sobre la tabla. */
export function AdminTableToolbar({ className, children }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-slate-200/80 px-4 py-3 sm:flex-row sm:items-center lg:px-5',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * En celulares y tablets (index.css, `.tabla-responsiva`) cada fila se muestra como tarjeta:
 * una columna hace de título (la primera, o la que tenga `data-tarjeta="titulo"` en su encabezado),
 * el resto se lee como "etiqueta: valor" y las acciones van al pie.
 * Las etiquetas salen del encabezado, así que las páginas no tienen que repetirlas.
 */
export function AdminTable({ className, anchosFijos = true, ...props }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const tabla = ref.current?.querySelector('table')
    if (!tabla) return

    const encabezados = [...tabla.querySelectorAll('thead th')]
    const titulos = encabezados.map((th) => th.textContent.trim())
    const columnaTitulo = Math.max(0, encabezados.findIndex((th) => th.dataset.tarjeta === 'titulo'))
    for (const fila of tabla.querySelectorAll('tbody tr')) {
      ;[...fila.children].forEach((celda, i) => {
        delete celda.dataset.celda
        delete celda.dataset.label
        if (celda.colSpan > 1) celda.dataset.celda = 'vacia'
        else if (i === columnaTitulo) celda.dataset.celda = 'titulo'
        else if (titulos[i] === 'Acciones') celda.dataset.celda = 'acciones'
        else if (titulos[i]) celda.dataset.label = titulos[i]
      })
    }
  })

  return (
    <div ref={ref} className="tabla-responsiva">
      {/* Tremor aplica className al contenedor: table-fixed va a la <table> para que respete los anchos
          de las columnas. Las tablas sin anchos definidos usan anchosFijos={false}. */}
      <Table
        className={cn('w-full !overflow-x-auto !overflow-y-hidden', anchosFijos && '[&>table]:table-fixed', className)}
        {...props}
      />
    </div>
  )
}

export function AdminTableHead({ className, ...props }) {
  return <TableHead className={cn('border-b border-slate-200/80 bg-slate-50/80', className)} {...props} />
}

export function AdminTableHeaderCell({ className, ...props }) {
  return (
    <TableHeaderCell
      className={cn(
        'h-10 align-middle whitespace-nowrap text-left text-[11px] font-medium uppercase tracking-wider text-slate-500',
        cellPadding,
        className
      )}
      {...props}
    />
  )
}

export function AdminTableActionsHeaderCell({ className, children = 'Acciones', ...props }) {
  return (
    <AdminTableHeaderCell className={cn('!text-right w-28 whitespace-nowrap', className)} {...props}>
      {children}
    </AdminTableHeaderCell>
  )
}

export function AdminTableBody({ className, ...props }) {
  return <TableBody className={cn('divide-y divide-slate-100', className)} {...props} />
}

export function AdminTableRow({ className, ...props }) {
  return <TableRow className={cn('transition-colors hover:bg-slate-50/70', className)} {...props} />
}

export function AdminTableCell({ className, ...props }) {
  return (
    <TableCell
      className={cn('py-3 align-middle whitespace-normal text-left text-sm text-slate-600', cellPadding, className)}
      {...props}
    />
  )
}

export function AdminTableActionsCell({ className, children, ...props }) {
  return (
    <AdminTableCell className={cn('w-28', className)} {...props}>
      <div className="flex items-center justify-end gap-0.5">{children}</div>
    </AdminTableCell>
  )
}

export function AdminTableEmptyCell({ className, ...props }) {
  return <AdminTableCell className={cn('!text-center py-14 text-slate-500', className)} {...props} />
}
