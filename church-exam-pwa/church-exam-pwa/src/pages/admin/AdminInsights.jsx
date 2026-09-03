import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { isQuestionCorrect } from '../../lib/grading.js'

export default function AdminInsights() {
  const [exams, setExams] = useState([])
  const [examId, setExamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [classStats, setClassStats] = useState([])
  const [questionStats, setQuestionStats] = useState([])

  useEffect(() => {
    supabase.from('exams').select('id, title').order('created_at', { ascending: false }).then(({ data }) => {
      setExams(data || [])
      if (data && data.length) setExamId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!examId) return
    const load = async () => {
      setLoading(true)
      const [{ data: attempts }, { data: questions }] = await Promise.all([
        supabase
          .from('attempts')
          .select('score, total_points, answers, profiles(class_id, classes!class_id(name))')
          .eq('exam_id', examId)
          .eq('status', 'submitted'),
        supabase.from('questions').select('*, options(*)').eq('exam_id', examId).order('question_order')
      ])

      const questionsSorted = (questions || []).map((q) => ({
        ...q,
        options: (q.options || []).sort((a, b) => a.option_order - b.option_order)
      }))

      // Per-class averages
      const byClass = {}
      ;(attempts || []).forEach((a) => {
        const key = a.profiles?.classes?.name || 'No class'
        if (!byClass[key]) byClass[key] = { name: key, total: 0, count: 0 }
        const pct = a.total_points ? (a.score / a.total_points) * 100 : 0
        byClass[key].total += pct
        byClass[key].count += 1
      })
      const classResult = Object.values(byClass)
        .map((c) => ({ ...c, average: Math.round(c.total / c.count) }))
        .sort((a, b) => b.average - a.average)

      // Most-missed questions
      const questionResult = questionsSorted.map((q) => {
        let missed = 0
        ;(attempts || []).forEach((a) => {
          if (!isQuestionCorrect(q, a.answers?.[q.id])) missed++
        })
        const attemptCount = (attempts || []).length
        return {
          id: q.id,
          text: stripHtml(q.question_html) || '(untitled question)',
          missed,
          attemptCount,
          missRate: attemptCount ? Math.round((missed / attemptCount) * 100) : 0
        }
      }).sort((a, b) => b.missRate - a.missRate)

      setClassStats(classResult)
      setQuestionStats(questionResult)
      setLoading(false)
    }
    load()
  }, [examId])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-indigo">Class insights</h1>
        <p className="text-ink/55 text-sm mt-1">See how each class did, and which questions tripped students up most.</p>
      </div>

      <select className="field max-w-sm" value={examId} onChange={(e) => setExamId(e.target.value)}>
        {exams.map((e) => (
          <option key={e.id} value={e.id}>{e.title}</option>
        ))}
      </select>

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : (
        <>
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-indigo mb-4">Average score by class</h2>
            {classStats.length === 0 ? (
              <p className="text-sm text-ink/50">No submissions yet for this exam.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {classStats.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm font-medium text-ink truncate">{c.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-indigo/8 overflow-hidden">
                      <div
                        className={`h-full ${c.average >= 50 ? 'bg-forest' : 'bg-rose'}`}
                        style={{ width: `${c.average}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-sm font-semibold text-ink text-right">{c.average}%</span>
                    <span className="w-20 shrink-0 text-xs text-ink/40 text-right">{c.count} student{c.count === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-indigo mb-1">Most-missed questions</h2>
            <p className="text-ink/50 text-xs mb-4">What's worth going over again as a class.</p>
            {questionStats.length === 0 ? (
              <p className="text-sm text-ink/50">No data yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {questionStats.slice(0, 10).map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3">
                    <span className="w-6 text-xs font-semibold text-ink/40 shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="flex-1 text-sm text-ink/80 line-clamp-2">{q.text}</p>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${q.missRate >= 50 ? 'bg-rose/10 text-rose' : 'bg-ink/8 text-ink/50'}`}>
                      {q.missRate}% missed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').trim()
}
