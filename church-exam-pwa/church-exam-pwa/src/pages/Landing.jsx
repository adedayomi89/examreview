import { Link } from 'react-router-dom'
import { BrandMark, BrandHeading } from '../components/Brand.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'

export default function Landing() {
  const { settings } = useSettings()

  return (
    <div className="min-h-screen bg-radiant flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl">
          <div className="flex flex-col items-center text-center gap-5 mb-14">
            <BrandMark size={84} />
            <BrandHeading align="center" subtitle={settings.welcome_message} />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <Link
              to="/student/login"
              className="card group p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lift transition-all duration-300"
            >
              <span className="w-12 h-12 rounded-2xl bg-forest/10 text-forest flex items-center justify-center text-xl">
                🎓
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-indigo">Student portal</h2>
                <p className="text-ink/60 text-sm mt-1.5 leading-relaxed">
                  Sign in with your name and password to take your quarterly review exam and see your score.
                </p>
              </div>
              <span className="mt-auto text-sm font-semibold text-forest group-hover:translate-x-1 transition-transform">
                Continue as a student
              </span>
            </Link>

            <Link
              to="/admin/login"
              className="card group p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lift transition-all duration-300"
            >
              <span className="w-12 h-12 rounded-2xl bg-indigo/10 text-indigo flex items-center justify-center text-xl">
                🗝
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-indigo">Admin portal</h2>
                <p className="text-ink/60 text-sm mt-1.5 leading-relaxed">
                  Manage students, build exams, and open or lock the quarterly review for your department.
                </p>
              </div>
              <span className="mt-auto text-sm font-semibold text-indigo group-hover:translate-x-1 transition-transform">
                Continue as admin
              </span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-ink/40 pb-8 px-6">
        {settings.church_address}
      </footer>
    </div>
  )
}
