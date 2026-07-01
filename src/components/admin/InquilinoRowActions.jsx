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

function IconPencil({ className = 'h-4 w-4' }) {
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

function IconTrash({ className = 'h-4 w-4' }) {
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

function IconEye({ className = 'h-4 w-4' }) {
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

const btnBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition hover:shadow-sm'

const iconSm = 'h-3.5 w-3.5'

export default function InquilinoRowActions({ onEdit, onDelete, onView }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {onEdit && (
        <ActionButton
          label="Editar"
          className={`${btnBase} border-brand-300 text-brand-600 hover:bg-brand-50`}
          onClick={onEdit}
        >
          <IconPencil className={iconSm} />
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton
          label="Eliminar"
          className={`${btnBase} border-red-300 text-red-600 hover:bg-red-50`}
          onClick={onDelete}
        >
          <IconTrash className={iconSm} />
        </ActionButton>
      )}
      {onView && (
        <ActionButton
          label="Ver detalle"
          className={`${btnBase} border-slate-300 text-slate-600 hover:bg-slate-50`}
          onClick={onView}
        >
          <IconEye className={iconSm} />
        </ActionButton>
      )}
    </div>
  )
}
