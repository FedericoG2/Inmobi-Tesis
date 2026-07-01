export default function AdminFormModalHeader({ title, titleId, icon }) {
  return (
    <div className="bg-brand-600 px-6 py-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
            {icon}
          </span>
        ) : null}
        <h2 id={titleId} className="text-lg font-semibold leading-snug text-white">
          {title}
        </h2>
      </div>
    </div>
  )
}
