import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react'

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

const cellPadding = 'px-4 py-3.5 first:pl-6 last:pr-6'

export function AdminTable({ className, ...props }) {
  return <Table className={cn('w-full table-fixed !overflow-x-auto !overflow-y-hidden', className)} {...props} />
}

export function AdminTableHead({ className, ...props }) {
  return (
    <TableHead
      className={cn('border-b border-slate-200 bg-slate-50', className)}
      {...props}
    />
  )
}

export function AdminTableHeaderCell({ className, ...props }) {
  return (
    <TableHeaderCell
      className={cn(
        'align-middle whitespace-nowrap text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
        cellPadding,
        className
      )}
      {...props}
    />
  )
}

export function AdminTableActionsHeaderCell({ className, children = 'Acciones', ...props }) {
  return (
    <AdminTableHeaderCell
      className={cn('!text-right w-28 whitespace-nowrap', className)}
      {...props}
    >
      {children}
    </AdminTableHeaderCell>
  )
}

export function AdminTableBody({ className, ...props }) {
  return <TableBody className={cn('divide-slate-100', className)} {...props} />
}

export function AdminTableRow({ className, ...props }) {
  return (
    <TableRow className={cn('transition-colors hover:bg-slate-50/90', className)} {...props} />
  )
}

export function AdminTableCell({ className, ...props }) {
  return (
    <TableCell
      className={cn(
        'align-middle whitespace-normal text-left text-sm text-slate-700',
        cellPadding,
        className
      )}
      {...props}
    />
  )
}

export function AdminTableActionsCell({ className, children, ...props }) {
  return (
    <AdminTableCell className={cn('w-28', className)} {...props}>
      <div className="flex items-center justify-end gap-2">{children}</div>
    </AdminTableCell>
  )
}

export function AdminTableEmptyCell({ className, ...props }) {
  return (
    <AdminTableCell
      className={cn('!text-center py-12 text-slate-500', className)}
      {...props}
    />
  )
}
