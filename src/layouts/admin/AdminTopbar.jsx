import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../supabaseClient'

export default function AdminTopbar() {
  const { user } = useAuth()

  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Bienvenido
        </p>
        <p className="text-sm font-semibold text-slate-800">
          {user?.email ?? 'Administrador'}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Cerrar sesión
      </button>
    </header>
  )
}
