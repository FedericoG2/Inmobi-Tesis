function IconPencil({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  )
}

function IconTrash({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

function IconCheckCircle({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

function ActionButton({ label, className, children, onClick }) {
  return (
    <div className="group relative">
      <button type="button" aria-label={label} title={label} className={className} onClick={onClick}>
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  )
}

const deleteStyles = {
  danger: 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-500 bg-white text-red-500 transition hover:bg-red-50',
  finalize:
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-400 bg-white text-slate-600 transition hover:bg-slate-50',
}

export default function TableRowActions({
  onEdit,
  onDelete,
  deleteLabel = 'Eliminar',
  deleteVariant = 'danger',
}) {
  const DeleteIcon = deleteVariant === 'finalize' ? IconCheckCircle : IconTrash

  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <ActionButton
          label="Editar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-400 text-slate-900 transition hover:bg-amber-500"
          onClick={onEdit}
        >
          <IconPencil />
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton
          label={deleteLabel}
          className={deleteStyles[deleteVariant] ?? deleteStyles.danger}
          onClick={onDelete}
        >
          <DeleteIcon />
        </ActionButton>
      )}
    </div>
  )
}
