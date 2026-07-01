function IconEye({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function IconPencil({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  )
}

function IconTrash({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

function IconClipboard({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
      />
    </svg>
  )
}

function IconCheckCircle({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
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
    <button type="button" aria-label={label} title={label} className={className} onClick={onClick}>
      {children}
    </button>
  )
}

const btnBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition hover:shadow-sm'

export default function TableRowActions({
  onView,
  onManage,
  manageLabel = 'Gestionar',
  onEdit,
  onDelete,
  deleteLabel = 'Eliminar',
  deleteVariant = 'danger',
  onSecondaryDelete,
  secondaryDeleteLabel = 'Anular',
}) {
  const DeleteIcon = deleteVariant === 'finalize' ? IconCheckCircle : IconTrash

  return (
    <div className="flex items-center justify-center gap-1.5">
      {onView && (
        <ActionButton
          label="Ver detalle"
          className={`${btnBase} border-slate-300 text-slate-600 hover:bg-slate-50`}
          onClick={onView}
        >
          <IconEye />
        </ActionButton>
      )}
      {onManage && (
        <ActionButton
          label={manageLabel}
          className={`${btnBase} border-brand-300 text-brand-600 hover:bg-brand-50`}
          onClick={onManage}
        >
          <IconClipboard />
        </ActionButton>
      )}
      {onEdit && (
        <ActionButton
          label="Editar"
          className={`${btnBase} border-brand-300 text-brand-600 hover:bg-brand-50`}
          onClick={onEdit}
        >
          <IconPencil />
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton
          label={deleteLabel}
          className={`${btnBase} ${
            deleteVariant === 'finalize'
              ? 'border-brand-300 text-brand-600 hover:bg-brand-50'
              : 'border-red-300 text-red-600 hover:bg-red-50'
          }`}
          onClick={onDelete}
        >
          <DeleteIcon />
        </ActionButton>
      )}
      {onSecondaryDelete && (
        <ActionButton
          label={secondaryDeleteLabel}
          className={`${btnBase} border-red-300 text-red-600 hover:bg-red-50`}
          onClick={onSecondaryDelete}
        >
          <IconTrash />
        </ActionButton>
      )}
    </div>
  )
}
