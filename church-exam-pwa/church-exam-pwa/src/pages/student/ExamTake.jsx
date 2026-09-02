import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import CountdownTimer from '../../components/CountdownTimer.jsx'
import LoadingScreen from '../../components/LoadingScreen.jsx'
import { seededShuffle } from '../../lib/shuffle.js'
import { scoreAttempt } from '../../lib/grading.js'

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
          // Most likely cause: this exam is restricted to different class(es).
          alert("This exam isn't available for your class.")
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

      const withSortedOptions = (qData || []).map((q) => ({
        ...q,
        options: (q.options || []).sort((a, b) => a.option_order - b.option_order)
      }))
      // Shuffle question order and, within each question, option order —
      // seeded by this attempt so it's stable across reloads but different
      // per student.
      const shuffledQuestions = seededShuffle(withSortedOptions, `${existing.id}:q`).map((q) => ({
        ...q,
        options: q.question_type === 'matching' ? q.options : seededShuffle(q.options, `${existing.id}:${q.id}`)
      }))

      setExam(examData)
      setAttempt(existing)
      setAnswers(existing.answers || {})
      setQuestions(shuffledQuestions)
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

  const updateAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const merged = { ...prev, [questionId]: value }
      persistAnswers(merged)
      return merged
    })
  }

  const toggleOption = (question, optionId) => {
    const current = answers[question.id] || []
    const next = question.question_type === 'multiple'
      ? current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      : [optionId]
    updateAnswer(question.id, next)
  }

  const setFillBlank = (question, text) => updateAnswer(question.id, [text])

  const setMatch = (question, optionId, chosenText) => {
    const current = answers[question.id] || {}
    updateAnswer(question.id, { ...current, [optionId]: chosenText })
  }

  const isAnswered = (q) => {
    const a = answers[q.id]
    if (q.question_type === 'fill_blank') return !!(a && a[0] && a[0].trim())
    if (q.question_type === 'matching') return !!a && q.options.every((o) => a[o.id])
    return !!a && a.length > 0
  }

  const answeredCount = useMemo(() => questions.filter(isAnswered).length, [questions, answers])

  const submit = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    clearTimeout(saveTimer.current)

    const { score, totalPoints } = scoreAttempt(questions, answers)

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

            <div className="pl-10">
              {(q.question_type === 'single' || q.question_type === 'multiple' || q.question_type === 'true_false') && (
                <div className="flex flex-col gap-2">
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
                            q.question_type === 'multiple' ? 'rounded-md' : 'rounded-full'
                          } ${selected ? 'bg-gold border-gold text-indigo-deep' : 'border-indigo/25 text-transparent'}`}
                        >
                          ✓
                        </span>
                        <span className="flex-1 rich-content" dangerouslySetInnerHTML={{ __html: opt.option_html }} />
                      </button>
                    )
                  })}
                </div>
              )}

              {q.question_type === 'fill_blank' && (
                <input
                  type="text"
                  className="field max-w-md"
                  placeholder="Type your answer…"
                  value={(answers[q.id] && answers[q.id][0]) || ''}
                  onChange={(e) => setFillBlank(q, e.target.value)}
                />
              )}

              {q.question_type === 'matching' && (
                <MatchingQuestion question={q} value={answers[q.id] || {}} onChange={(optId, text) => setMatch(q, optId, text)} />
              )}
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

function MatchingQuestion({ question, value, onChange }) {
  // The right-hand choices, shuffled once (stable for the lifetime of this
  // render tree) so the correct order isn't given away positionally.
  const rightChoices = useMemo(
    () => seededShuffle(question.options.map((o) => o.match_text).filter(Boolean), `${question.id}:right`),
    [question]
  )

  return (
    <div className="flex flex-col gap-2">
      {question.options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-3 flex-wrap">
          <span className="rich-content flex-1 min-w-[140px]" dangerouslySetInnerHTML={{ __html: opt.option_html }} />
          <select
            className="field !w-auto min-w-[160px]"
            value={value[opt.id] || ''}
            onChange={(e) => onChange(opt.id, e.target.value)}
          >
            <option value="" disabled>Choose a match…</option>
            {rightChoices.map((text) => (
              <option key={text} value={text}>{text}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
