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

export function AdminTable({ className, ...props }) {
  return <Table className={cn('w-full table-fixed !overflow-x-auto !overflow-y-hidden', className)} {...props} />
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
