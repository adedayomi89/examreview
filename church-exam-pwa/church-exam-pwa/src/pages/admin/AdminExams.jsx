import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'

export default function AdminExams() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [exams, setExams] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('exams')
      .select('*, questions(count)')
      .order('created_at', { ascending: false })
    setExams(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const createExam = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('exams')
      .insert({ title: 'Untitled exam', created_by: profile.id })
      .select()
      .single()
    setCreating(false)
    if (error) return alert(error.message)
    navigate(`/admin/exams/${data.id}`)
  }

  const toggleOpen = async (exam) => {
    const { error } = await supabase.from('exams').update({ is_open: !exam.is_open }).eq('id', exam.id)
    if (error) return alert(error.message)
    setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, is_open: !exam.is_open } : e)))
  }

  const deleteExam = async (exam) => {
    if (!confirm(`Delete "${exam.title}"? This removes all its questions and student attempts.`)) return
    const { error } = await supabase.from('exams').delete().eq('id', exam.id)
    if (error) return alert(error.message)
    setExams((prev) => prev.filter((e) => e.id !== exam.id))
  }

  const shareOnWhatsApp = (exam) => {
    const link = `${window.location.origin}/student/login`
    const text = `📚 "${exam.title}" is now open for ${settings.department_name} at ${settings.church_name}!\n\nSign in here to take it: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-indigo">Exams</h1>
          <p className="text-ink/55 text-sm mt-1">Build questions, then open an exam when it's ready for students.</p>
        </div>
        <button className="btn-primary" onClick={createExam} disabled={creating}>
          {creating ? 'Creating…' : '+ New exam'}
        </button>
      </div>

      {exams === null ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : exams.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink/60">No exams yet. Create your first quarterly review exam.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div key={exam.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-indigo truncate">{exam.title}</h3>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {exam.questions?.[0]?.count ?? 0} question{exam.questions?.[0]?.count === 1 ? '' : 's'} · {exam.duration_minutes} min
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    exam.is_open ? 'bg-forest/10 text-forest' : 'bg-ink/8 text-ink/50'
                  }`}
                >
                  {exam.is_open ? 'Open' : 'Locked'}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <Link to={`/admin/exams/${exam.id}`} className="btn-outline flex-1 !py-2 text-sm">
                  Edit
                </Link>
                <button onClick={() => toggleOpen(exam)} className={`btn flex-1 !py-2 text-sm ${exam.is_open ? 'btn-outline' : 'btn-gold'}`}>
                  {exam.is_open ? 'Lock' : 'Open'}
                </button>
                <button onClick={() => deleteExam(exam)} className="btn-ghost !py-2 !px-3 text-sm text-rose">
                  Delete
                </button>
              </div>
              {exam.is_open && (
                <button
                  onClick={() => shareOnWhatsApp(exam)}
                  className="btn-ghost !py-2 text-sm text-forest flex items-center justify-center gap-1.5"
                >
                  💬 Share on WhatsApp
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
