import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import CountdownTimer from '../../components/CountdownTimer.jsx'
import LoadingScreen from '../../components/LoadingScreen.jsx'

export default function ExamTake() {
  const { examId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: examData, error: examErr } = await supabase.from('exams').select('*').eq('id', examId).single()
      if (examErr || !examData) {
        alert('This exam is not available.')
        navigate('/student')
        return
      }

      // Find (or create) this student's attempt.
      let { data: existing } = await supabase
        .from('attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', profile.id)
        .maybeSingle()

      if (existing?.status === 'submitted') {
        navigate(`/student/exam/${examId}/result`)
        return
      }

      if (!existing) {
        if (!examData.is_open) {
          alert('This exam is not open yet.')
          navigate('/student')
          return
        }
        const { data: created, error: createErr } = await supabase
          .from('attempts')
          .insert({ exam_id: examId, student_id: profile.id, status: 'in_progress', answers: {} })
          .select()
          .single()
        if (createErr) {
          alert(createErr.message)
          navigate('/student')
          return
        }
        existing = created
      }

      const { data: qData } = await supabase
        .from('questions')
        .select('*, options(*)')
        .eq('exam_id', examId)
        .order('question_order', { ascending: true })

      setExam(examData)
      setAttempt(existing)
      setAnswers(existing.answers || {})
      setQuestions((qData || []).map((q) => ({ ...q, options: (q.options || []).sort((a, b) => a.option_order - b.option_order) })))
      setLoading(false)
    }
    if (profile) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, profile])

  const persistAnswers = useCallback(
    (nextAnswers) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        supabase.from('attempts').update({ answers: nextAnswers }).eq('id', attempt.id)
      }, 500)
    },
    [attempt]
  )

  const toggleOption = (question, optionId) => {
    setAnswers((prev) => {
      const current = prev[question.id] || []
      let next
      if (question.question_type === 'single') {
        next = [optionId]
      } else {
        next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      }
      const merged = { ...prev, [question.id]: next }
      persistAnswers(merged)
      return merged
    })
  }

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] || []).length > 0).length,
    [questions, answers]
  )

  const submit = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    clearTimeout(saveTimer.current)

    let score = 0
    let totalPoints = 0
    questions.forEach((q) => {
      totalPoints += q.points
      const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id).sort()
      const givenIds = [...(answers[q.id] || [])].sort()
      const isMatch = correctIds.length === givenIds.length && correctIds.every((id, i) => id === givenIds[i])
      if (isMatch && correctIds.length > 0) score += q.points
    })

    await supabase
      .from('attempts')
      .update({ answers, status: 'submitted', score, total_points: totalPoints, submitted_at: new Date().toISOString() })
      .eq('id', attempt.id)

    navigate(`/student/exam/${examId}/result`)
  }, [questions, answers, attempt, examId, navigate])

  const confirmSubmit = () => {
    const unanswered = questions.length - answeredCount
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
      : 'Submit your exam now? You cannot change your answers after this.'
    if (confirm(msg)) submit()
  }

  if (loading) return <LoadingScreen label="Preparing your exam…" />

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-4 bg-cream/90 backdrop-blur border-b border-indigo/8 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold text-indigo truncate">{exam.title}</h1>
          <p className="text-xs text-ink/50">{answeredCount}/{questions.length} answered</p>
        </div>
        <CountdownTimer startedAt={attempt.started_at} durationMinutes={exam.duration_minutes} onExpire={submit} />
      </div>

      <div className="h-1.5 rounded-full bg-indigo/8 overflow-hidden">
        <div
          className="h-full bg-gold transition-all duration-500"
          style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
        />
      </div>

      <div className="flex flex-col gap-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="card p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo/10 text-indigo text-sm font-semibold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="rich-content flex-1" dangerouslySetInnerHTML={{ __html: q.question_html }} />
            </div>
            <div className="flex flex-col gap-2 pl-10">
              {q.options.map((opt) => {
                const selected = (answers[q.id] || []).includes(opt.id)
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleOption(q, opt.id)}
                    className={`text-left rounded-2xl border px-4 py-3 flex items-start gap-3 transition-colors ${
                      selected ? 'border-gold bg-gold/10' : 'border-indigo/12 hover:border-indigo/25'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 border-2 flex items-center justify-center text-[11px] font-bold ${
                        q.question_type === 'single' ? 'rounded-full' : 'rounded-md'
                      } ${selected ? 'bg-gold border-gold text-indigo-deep' : 'border-indigo/25 text-transparent'}`}
                    >
                      ✓
                    </span>
                    <span className="flex-1 rich-content" dangerouslySetInnerHTML={{ __html: opt.option_html }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 flex items-center justify-between gap-4 flex-wrap sticky bottom-4">
        <p className="text-sm text-ink/60">
          {answeredCount === questions.length ? "All done — ready to submit." : `${questions.length - answeredCount} question(s) left.`}
        </p>
        <button className="btn-primary" onClick={confirmSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit exam'}
        </button>
      </div>

      <Link to="/student" className="text-xs text-ink/40 hover:text-ink/60 self-center">
        Leave without submitting (your progress is saved)
      </Link>
    </div>
  )
}
