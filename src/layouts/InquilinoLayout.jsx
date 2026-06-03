import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import InquilinoBottomNav from '../components/inquilino/InquilinoBottomNav'

export default function InquilinoLayout() {
  const { user } = useAuth()

  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Mi cuenta</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {user?.email ?? 'Inquilino'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs font-medium text-indigo-600"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        <Outlet />
      </main>

      <InquilinoBottomNav />
    </div>
  )
}
