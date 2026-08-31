import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const load = async () => {
      const [{ count: studentCount }, { count: examCount }, { count: openCount }, { data: attempts }] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('exams').select('*', { count: 'exact', head: true }),
          supabase.from('exams').select('*', { count: 'exact', head: true }).eq('is_open', true),
          supabase
            .from('attempts')
            .select('id, score, total_points, submitted_at, status, exams(title), profiles(full_name)')
            .eq('status', 'submitted')
            .order('submitted_at', { ascending: false })
            .limit(6)
        ])
      setStats({ studentCount: studentCount || 0, examCount: examCount || 0, openCount: openCount || 0 })
      setRecent(attempts || [])
    }
    load()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-indigo">Overview</h1>
        <p className="text-ink/55 text-sm mt-1">A quick look at your Sunday School exam portal.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Enrolled students" value={stats?.studentCount} icon="🎓" to="/admin/students" />
        <StatCard label="Total exams" value={stats?.examCount} icon="📝" to="/admin/exams" />
        <StatCard label="Currently open" value={stats?.openCount} icon="🟢" to="/admin/exams" accent />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-indigo mb-4">Recent submissions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/50">No exams have been submitted yet.</p>
        ) : (
          <ul className="divide-y divide-indigo/8">
            {recent.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{a.profiles?.full_name}</p>
                  <p className="text-xs text-ink/50 truncate">{a.exams?.title}</p>
                </div>
                <span className="text-sm font-semibold text-forest shrink-0">
                  {a.score}/{a.total_points}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/attempts" className="inline-block mt-4 text-sm font-semibold text-indigo hover:underline">
          View all results →
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, to, accent }) {
  return (
    <Link to={to} className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lift transition-all">
      <span
        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
          accent ? 'bg-forest/10 text-forest' : 'bg-indigo/10 text-indigo'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-2xl font-display font-semibold text-ink leading-none">{value ?? '–'}</p>
        <p className="text-xs text-ink/50 mt-1">{label}</p>
      </div>
    </Link>
  )
}
