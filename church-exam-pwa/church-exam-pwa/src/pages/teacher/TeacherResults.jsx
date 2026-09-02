import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'

export default function TeacherResults() {
  const [attempts, setAttempts] = useState(null)
  const [exams, setExams] = useState([])
  const [examFilter, setExamFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      // RLS already limits this to attempts by students in the signed-in
      // teacher's assigned class(es) — no extra filtering needed here.
      const [{ data: examData }, { data: attemptData }] = await Promise.all([
        supabase.from('exams').select('id, title').order('created_at', { ascending: false }),
        supabase
          .from('attempts')
          .select('id, score, total_points, submitted_at, exam_id, exams(title), profiles(full_name, username)')
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
      ])
      setExams(examData || [])
      setAttempts(attemptData || [])
    }
    load()
  }, [])

  const filtered = (attempts || []).filter((a) => examFilter === 'all' || a.exam_id === examFilter)
  const average = filtered.length
    ? Math.round(filtered.reduce((sum, a) => sum + (a.total_points ? (a.score / a.total_points) * 100 : 0), 0) / filtered.length)
    : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-indigo">Results</h1>
        <p className="text-ink/55 text-sm mt-1">Submitted exams from students in your class.</p>
      </div>

      <select className="field max-w-xs" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
        <option value="all">All exams</option>
        {exams.map((e) => (
          <option key={e.id} value={e.id}>{e.title}</option>
        ))}
      </select>

      {average !== null && (
        <div className="card p-5 flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-forest/10 text-forest flex items-center justify-center text-lg">📊</span>
          <div>
            <p className="text-2xl font-display font-semibold text-ink leading-none">{average}%</p>
            <p className="text-xs text-ink/50 mt-1">Class average · {filtered.length} submission{filtered.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden overflow-x-auto">
        {attempts === null ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-ink/45 text-xs uppercase tracking-wide border-b border-indigo/8">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Exam</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const pct = a.total_points ? Math.round((a.score / a.total_points) * 100) : 0
                return (
                  <tr key={a.id} className="border-b border-indigo/6 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{a.profiles?.full_name}</p>
                      <p className="text-xs text-ink/45">{a.profiles?.username}</p>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{a.exams?.title}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${pct >= 50 ? 'text-forest' : 'text-rose'}`}>{a.score}/{a.total_points}</span>
                      <span className="text-ink/40 text-xs ml-1">({pct}%)</span>
                    </td>
                    <td className="px-5 py-3 text-ink/50 text-xs">{new Date(a.submitted_at).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
