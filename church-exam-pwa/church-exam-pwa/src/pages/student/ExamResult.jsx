import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import LoadingScreen from '../../components/LoadingScreen.jsx'

export default function ExamResult() {
  const { examId } = useParams()
  const { profile } = useAuth()
  const [exam, setExam] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    const load = async () => {
      const [{ data: examData }, { data: attemptData }, { data: qData }] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('attempts').select('*').eq('exam_id', examId).eq('student_id', profile.id).single(),
        supabase.from('questions').select('*, options(*)').eq('exam_id', examId).order('question_order')
      ])
      setExam(examData)
      setAttempt(attemptData)
      setQuestions((qData || []).map((q) => ({ ...q, options: (q.options || []).sort((a, b) => a.option_order - b.option_order) })))
    }
    if (profile) load()
  }, [examId, profile])

  if (!exam || !attempt) return <LoadingScreen label="Loading your result…" />

  const pct = attempt.total_points ? Math.round((attempt.score / attempt.total_points) * 100) : 0
  const passed = pct >= (exam.pass_mark_percent ?? 50)

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  const ringColor = passed ? '#2F6B4F' : '#A93A38'

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-2xl mx-auto">
      <div className="card p-8 flex flex-col items-center text-center gap-4 relative overflow-hidden">
        {passed && <Confetti />}
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-dim">{exam.title.toUpperCase()}</p>

        <div className="relative w-[180px] h-[180px]">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(45,27,78,0.08)" strokeWidth="14" />
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-indigo">{pct}%</span>
            <span className="text-xs text-ink/45 mt-1">{attempt.score}/{attempt.total_points} pts</span>
          </div>
        </div>

        <div>
          <p className={`font-display text-xl font-semibold ${passed ? 'text-forest' : 'text-rose'}`}>
            {passed ? 'Well done! 🎉' : 'Keep studying and try again next time'}
          </p>
          <p className="text-sm text-ink/55 mt-1">
            {passed
              ? "You've passed this quarter's review exam."
              : `You needed ${exam.pass_mark_percent}% to pass this one.`}
          </p>
        </div>

        <Link to="/student" className="btn-primary mt-2">Back to my exams</Link>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-indigo mb-4">Review your answers</h2>
        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => {
            const correctIds = new Set(q.options.filter((o) => o.is_correct).map((o) => o.id))
            const given = new Set(attempt.answers?.[q.id] || [])
            const wasCorrect =
              correctIds.size === given.size && [...correctIds].every((id) => given.has(id)) && correctIds.size > 0

            return (
              <div key={q.id} className="card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`w-7 h-7 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 ${
                      wasCorrect ? 'bg-forest/10 text-forest' : 'bg-rose/10 text-rose'
                    }`}
                  >
                    {wasCorrect ? '✓' : '✕'}
                  </span>
                  <div className="rich-content flex-1" dangerouslySetInnerHTML={{ __html: q.question_html }} />
                </div>
                <div className="flex flex-col gap-2 pl-10">
                  {q.options.map((opt) => {
                    const isGiven = given.has(opt.id)
                    const isCorrect = correctIds.has(opt.id)
                    let style = 'border-indigo/10'
                    if (isCorrect) style = 'border-forest bg-forest/8'
                    else if (isGiven && !isCorrect) style = 'border-rose bg-rose/8'
                    return (
                      <div key={opt.id} className={`rounded-xl border px-4 py-2.5 flex items-center gap-2 text-sm ${style}`}>
                        <span dangerouslySetInnerHTML={{ __html: opt.option_html }} className="flex-1 rich-content" />
                        {isCorrect && <span className="text-forest text-xs font-semibold shrink-0">Correct</span>}
                        {isGiven && !isCorrect && <span className="text-rose text-xs font-semibold shrink-0">Your answer</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Confetti() {
  const pieces = Array.from({ length: 18 })
  const colors = ['#C9A227', '#2F6B4F', '#402a68', '#E7C765']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 97) % 100}%`,
            top: '-10px',
            width: 6,
            height: 10,
            background: colors[i % colors.length],
            opacity: 0.8,
            borderRadius: 2,
            animation: `fall 1.8s ease-in ${((i * 71) % 500) / 1000}s forwards`
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to { transform: translateY(220px) rotate(200deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
