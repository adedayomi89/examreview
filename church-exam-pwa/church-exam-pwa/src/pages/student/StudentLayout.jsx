import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { BrandMark } from '../../components/Brand.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'

export default function StudentLayout() {
  const { profile, signOut } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const doSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-paper border-b border-indigo/8">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={38} />
            <div className="min-w-0">
              <p className="font-display font-semibold text-indigo text-sm leading-tight truncate">{settings.church_name}</p>
              <p className="text-xs text-ink/50 truncate">{settings.department_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-ink/70 hidden sm:inline">{profile?.full_name}</span>
            <button onClick={doSignOut} className="btn-ghost !py-1.5 !px-3 text-sm">Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
