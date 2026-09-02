import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useClasses } from '../../lib/useClasses.js'

export default function StudentDashboard() {
  const { profile, refreshProfile } = useAuth()
  const { classes } = useClasses()
  const [exams, setExams] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [savingClass, setSavingClass] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: examData }, { data: attemptData }, { data: ecData }] = await Promise.all([
        supabase.from('exams').select('*').order('created_at', { ascending: false }),
        supabase.from('attempts').select('*').eq('student_id', profile.id),
        supabase.from('exam_classes').select('exam_id, class_id')
      ])
      const restrictedExamIds = new Set((ecData || []).map((r) => r.exam_id))
      const allowedExamIds = new Set(
        (ecData || []).filter((r) => r.class_id === profile.class_id).map((r) => r.exam_id)
      )
      const visible = (examData || []).filter((e) => !restrictedExamIds.has(e.id) || allowedExamIds.has(e.id))
      setExams(visible)
      setAttempts(attemptData || [])
    }
    if (profile) load()
  }, [profile])

  if (!exams) return <p className="text-sm text-ink/50">Loading your exams…</p>

  const attemptFor = (examId) => attempts.find((a) => a.exam_id === examId)

  const changeClass = async (e) => {
    const newClassId = e.target.value
    setSavingClass(true)
    await supabase.from('profiles').update({ class_id: newClassId || null }).eq('id', profile.id)
    await refreshProfile()
    setSavingClass(false)
  }

  const available = exams.filter((e) => e.is_open && !attemptFor(e.id))
  const inProgress = exams.filter((e) => {
    const a = attemptFor(e.id)
    return a && a.status === 'in_progress'
  })
  const completed = exams.filter((e) => {
    const a = attemptFor(e.id)
    return a && a.status === 'submitted'
  })
  const upcoming = exams.filter((e) => !e.is_open && !attemptFor(e.id))

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-indigo">Hello, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-ink/55 text-sm mt-1">Here's everything for your quarterly reviews.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-indigo/60">Your class</label>
          <select
            className="text-sm rounded-xl border border-indigo/15 bg-paper px-3 py-2 text-indigo"
            value={profile?.class_id || ''}
            onChange={changeClass}
            disabled={savingClass}
          >
            <option value="" disabled>Select…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {inProgress.length > 0 && (
        <Section title="Continue where you left off">
          {inProgress.map((exam) => (
            <ExamCard key={exam.id} exam={exam} status="in_progress" />
          ))}
        </Section>
      )}

      <Section title="Available now" empty="No exams are open right now — check back soon.">
        {available.map((exam) => (
          <ExamCard key={exam.id} exam={exam} status="available" />
        ))}
      </Section>

      <Section title="Completed" empty="You haven't completed any exams yet.">
        {completed.map((exam) => (
          <ExamCard key={exam.id} exam={exam} status="submitted" attempt={attemptFor(exam.id)} />
        ))}
      </Section>

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((exam) => (
            <ExamCard key={exam.id} exam={exam} status="locked" />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children, empty }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  const hasItems = items.some((c) => c)
  return (
    <div>
      <h2 className="font-display text-base font-semibold text-indigo/80 mb-3">{title}</h2>
      {hasItems ? (
        <div className="grid sm:grid-cols-2 gap-4">{children}</div>
      ) : (
        <p className="text-sm text-ink/45">{empty}</p>
      )}
    </div>
  )
}

function ExamCard({ exam, status, attempt }) {
  const pct = attempt && attempt.total_points ? Math.round((attempt.score / attempt.total_points) * 100) : null

  return (
    <div className={`card p-5 flex flex-col gap-3 ${status === 'locked' ? 'opacity-60' : ''}`}>
      <div>
        <h3 className="font-display font-semibold text-indigo">{exam.title}</h3>
        {exam.description && <p className="text-sm text-ink/55 mt-1 line-clamp-2">{exam.description}</p>}
      </div>
      <p className="text-xs text-ink/45">⏱ {exam.duration_minutes} minutes</p>

      {status === 'available' && (
        <Link to={`/student/exam/${exam.id}`} className="btn-primary mt-auto">Start exam</Link>
      )}
      {status === 'in_progress' && (
        <Link to={`/student/exam/${exam.id}`} className="btn-gold mt-auto">Resume exam</Link>
      )}
      {status === 'submitted' && (
        <div className="mt-auto flex items-center justify-between">
          <span className={`text-lg font-display font-semibold ${pct >= (exam.pass_mark_percent ?? 50) ? 'text-forest' : 'text-rose'}`}>
            {pct}%
          </span>
          <Link to={`/student/exam/${exam.id}/result`} className="btn-outline !py-2 text-sm">View result</Link>
        </div>
      )}
      {status === 'locked' && (
        <span className="mt-auto text-xs font-semibold text-ink/40">Not open yet</span>
      )}
    </div>
  )
}
