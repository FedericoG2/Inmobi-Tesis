const THEMES = {
  indigo: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    valueColor: 'text-indigo-700',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
  },
  sky: {
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    valueColor: 'text-sky-700',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
  violet: {
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    valueColor: 'text-violet-700',
  },
}

function IconBuilding({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5M3.75 9.75v10.5M9.75 9.75v10.5M15.75 9.75v10.5M21 9.75v10.5M4.5 6.75h15M12 2.25v4.5"
      />
    </svg>
  )
}

function IconChart({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  )
}

function IconClipboard({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  )
}

function IconWrench({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608"
      />
    </svg>
  )
}

function IconCalendar({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  )
}

const ICONS = {
  building: IconBuilding,
  chart: IconChart,
  clipboard: IconClipboard,
  wrench: IconWrench,
  calendar: IconCalendar,
}

export default function StatCard({ label, value, icon, theme = 'indigo' }) {
  const t = THEMES[theme] ?? THEMES.indigo
  const Icon = ICONS[icon] ?? IconBuilding

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${t.iconColor}`} />
        </div>
        <p className={`text-3xl font-bold tracking-tight ${t.valueColor}`}>{value}</p>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{label}</p>
    </div>
  )
}
