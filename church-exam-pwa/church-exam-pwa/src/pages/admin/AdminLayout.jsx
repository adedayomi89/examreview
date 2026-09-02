import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { BrandMark } from '../../components/Brand.jsx'

const NAV = [
  { to: '/admin', label: 'Overview', icon: '◈', end: true },
  { to: '/admin/exams', label: 'Exams', icon: '📝' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/teachers', label: 'Teachers', icon: '🧑‍🏫' },
  { to: '/admin/attempts', label: 'Results', icon: '📊' },
  { to: '/admin/insights', label: 'Class insights', icon: '📈' },
  { to: '/admin/settings', label: 'Site settings', icon: '⚙' }
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)

  const doSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-indigo-deep text-cream flex flex-col transition-transform duration-300 ${
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-cream/10">
          <BrandMark size={38} />
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm leading-tight truncate">Admin</p>
            <p className="text-xs text-cream/50 truncate">{profile?.full_name}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-gold text-indigo-deep' : 'text-cream/70 hover:bg-cream/10 hover:text-cream'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-cream/10">
          <button onClick={doSignOut} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-cream/70 hover:bg-cream/10 hover:text-cream flex items-center gap-3">
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {navOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-paper border-b border-indigo/10">
          <button onClick={() => setNavOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-indigo/5 text-indigo">
            ☰
          </button>
          <BrandMark size={32} />
        </header>
        <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
