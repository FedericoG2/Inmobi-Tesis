export default function AdminModuleHeader({ title, subtitle, titleAction }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {titleAction}
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
