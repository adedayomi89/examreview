import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { BrandMark } from '../../components/Brand.jsx'

const NAV = [
  { to: '/teacher', label: 'My students', icon: '🎓', end: true },
  { to: '/teacher/results', label: 'Results', icon: '📊' }
]

export default function TeacherLayout() {
  const { profile, teacherClassIds, signOut } = useAuth()
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
              <p className="font-display font-semibold text-indigo text-sm leading-tight truncate">{profile?.full_name}</p>
              <p className="text-xs text-ink/50 truncate">
                {teacherClassIds.length === 0 ? 'No class assigned yet' : 'Class teacher'}
              </p>
            </div>
          </div>
          <button onClick={doSignOut} className="btn-ghost !py-1.5 !px-3 text-sm shrink-0">Sign out</button>
        </div>
        <nav className="max-w-4xl mx-auto px-5 sm:px-8 flex gap-1 pb-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${
                  isActive ? 'bg-indigo text-cream' : 'text-indigo/60 hover:bg-indigo/8'
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
