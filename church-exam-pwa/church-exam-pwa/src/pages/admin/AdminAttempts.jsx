import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useClasses } from '../../lib/useClasses.js'

export default function AdminAttempts() {
  const [attempts, setAttempts] = useState(null)
  const [exams, setExams] = useState([])
  const [examFilter, setExamFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const { classes } = useClasses()

  useEffect(() => {
    const load = async () => {
      const [{ data: examData }, { data: attemptData }] = await Promise.all([
        supabase.from('exams').select('id, title').order('created_at', { ascending: false }),
        supabase
          .from('attempts')
          .select('id, score, total_points, submitted_at, status, exam_id, exams(title), profiles(full_name, username, class_id, classes(name))')
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
      ])
      setExams(examData || [])
      setAttempts(attemptData || [])
    }
    load()
  }, [])

  const filtered = (attempts || []).filter(
    (a) =>
      (examFilter === 'all' || a.exam_id === examFilter) &&
      (classFilter === 'all' || a.profiles?.class_id === classFilter)
  )

  const exportCsv = () => {
    const rows = [['Student', 'Username', 'Class', 'Exam', 'Score', 'Total', 'Percent', 'Submitted']]
    filtered.forEach((a) => {
      const pct = a.total_points ? Math.round((a.score / a.total_points) * 100) : 0
      rows.push([
        a.profiles?.full_name,
        a.profiles?.username,
        a.profiles?.classes?.name || '',
        a.exams?.title,
        a.score,
        a.total_points,
        `${pct}%`,
        new Date(a.submitted_at).toLocaleString()
      ])
    })
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exam-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-indigo">Results</h1>
          <p className="text-ink/55 text-sm mt-1">Every submitted exam attempt across your students.</p>
        </div>
        <button className="btn-outline" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="field max-w-xs" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
          <option value="all">All exams</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <select className="field max-w-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        {attempts === null ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[560px]">
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
                      <p className="text-xs text-ink/45">{a.profiles?.username} · {a.profiles?.classes?.name || 'No class'}</p>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{a.exams?.title}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${pct >= 50 ? 'text-forest' : 'text-rose'}`}>
                        {a.score}/{a.total_points}
                      </span>
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
