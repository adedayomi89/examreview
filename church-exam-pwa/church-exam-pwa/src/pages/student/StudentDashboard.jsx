import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [exams, setExams] = useState(null)
  const [attempts, setAttempts] = useState([])

  useEffect(() => {
    const load = async () => {
      const [{ data: examData }, { data: attemptData }] = await Promise.all([
        supabase.from('exams').select('*').order('created_at', { ascending: false }),
        supabase.from('attempts').select('*').eq('student_id', profile.id)
      ])
      setExams(examData || [])
      setAttempts(attemptData || [])
    }
    if (profile) load()
  }, [profile])

  if (!exams) return <p className="text-sm text-ink/50">Loading your exams…</p>

  const attemptFor = (examId) => attempts.find((a) => a.exam_id === examId)

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
      <div>
        <h1 className="font-display text-2xl font-semibold text-indigo">Hello, {profile?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-ink/55 text-sm mt-1">Here's everything for your quarterly reviews.</p>
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
