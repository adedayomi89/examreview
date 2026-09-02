import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import RichEditor from '../../components/RichEditor.jsx'
import { useClasses } from '../../lib/useClasses.js'

const TYPE_LABELS = {
  single: 'Single answer',
  multiple: 'Multiple answers',
  true_false: 'True / False',
  fill_blank: 'Fill in the blank',
  matching: 'Matching'
}

export default function AdminExamEditor() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)
  const [allowedClassIds, setAllowedClassIds] = useState(null) // null = all classes
  const { classes } = useClasses()

  const load = useCallback(async () => {
    const { data: examData, error } = await supabase.from('exams').select('*').eq('id', examId).single()
    if (error) {
      alert('Exam not found.')
      navigate('/admin/exams')
      return
    }
    setExam(examData)

    const [{ data: qData }, { data: ecData }] = await Promise.all([
      supabase.from('questions').select('*, options(*)').eq('exam_id', examId).order('question_order', { ascending: true }),
      supabase.from('exam_classes').select('class_id').eq('exam_id', examId)
    ])

    const sorted = (qData || []).map((q) => ({
      ...q,
      options: (q.options || []).sort((a, b) => a.option_order - b.option_order)
    }))
    setQuestions(sorted)
    setAllowedClassIds(ecData && ecData.length ? ecData.map((r) => r.class_id) : [])
  }, [examId, navigate])

  useEffect(() => {
    load()
  }, [load])

  const saveMeta = async (patch) => {
    const next = { ...exam, ...patch }
    setExam(next)
    setSavingMeta(true)
    const { error } = await supabase
      .from('exams')
      .update({
        title: next.title,
        description: next.description,
        duration_minutes: next.duration_minutes,
        pass_mark_percent: next.pass_mark_percent
      })
      .eq('id', examId)
    setSavingMeta(false)
    if (error) alert(error.message)
    else {
      setMetaSaved(true)
      setTimeout(() => setMetaSaved(false), 1500)
    }
  }

  const toggleClass = async (classId) => {
    const isAllowed = allowedClassIds.includes(classId)
    const next = isAllowed ? allowedClassIds.filter((id) => id !== classId) : [...allowedClassIds, classId]
    setAllowedClassIds(next)
    if (isAllowed) {
      await supabase.from('exam_classes').delete().eq('exam_id', examId).eq('class_id', classId)
    } else {
      await supabase.from('exam_classes').insert({ exam_id: examId, class_id: classId })
    }
  }

  const setAllClasses = async () => {
    setAllowedClassIds([])
    await supabase.from('exam_classes').delete().eq('exam_id', examId)
  }

  const addQuestion = async () => {
    const { data, error } = await supabase
      .from('questions')
      .insert({ exam_id: examId, question_order: questions.length, question_html: '', question_type: 'single', points: 1 })
      .select()
      .single()
    if (error) return alert(error.message)
    setQuestions((prev) => [...prev, { ...data, options: [] }])
  }

  const updateQuestionLocal = (qid, patch) => {
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...patch } : q)))
  }

  const removeQuestion = async (qid) => {
    if (!confirm('Delete this question and its options?')) return
    const { error } = await supabase.from('questions').delete().eq('id', qid)
    if (error) return alert(error.message)
    setQuestions((prev) => prev.filter((q) => q.id !== qid))
  }

  if (!exam || allowedClassIds === null) return <p className="text-sm text-ink/50">Loading…</p>

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/admin/exams" className="text-sm text-indigo/60 hover:text-indigo">← Back to exams</Link>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${exam.is_open ? 'bg-forest/10 text-forest' : 'bg-ink/8 text-ink/50'}`}>
          {exam.is_open ? 'Open to students' : 'Locked'}
        </span>
      </div>

      {/* Exam meta */}
      <div className="card p-6 flex flex-col gap-4">
        <div>
          <label className="label">Exam title</label>
          <input
            className="field font-display text-lg"
            value={exam.title}
            onChange={(e) => setExam({ ...exam, title: e.target.value })}
            onBlur={() => saveMeta({ title: exam.title })}
          />
        </div>
        <div>
          <label className="label">Description (shown to students before they start)</label>
          <textarea
            className="field"
            rows={2}
            value={exam.description || ''}
            onChange={(e) => setExam({ ...exam, description: e.target.value })}
            onBlur={() => saveMeta({ description: exam.description })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              className="field"
              value={exam.duration_minutes}
              onChange={(e) => setExam({ ...exam, duration_minutes: Number(e.target.value) })}
              onBlur={() => saveMeta({ duration_minutes: exam.duration_minutes })}
            />
          </div>
          <div>
            <label className="label">Pass mark (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="field"
              value={exam.pass_mark_percent}
              onChange={(e) => setExam({ ...exam, pass_mark_percent: Number(e.target.value) })}
              onBlur={() => saveMeta({ pass_mark_percent: exam.pass_mark_percent })}
            />
          </div>
        </div>
        <p className={`text-xs transition-opacity ${metaSaved ? 'opacity-100 text-forest' : 'opacity-0'}`}>
          {savingMeta ? 'Saving…' : 'Saved ✓'}
        </p>
      </div>

      {/* Visibility */}
      <div className="card p-6 flex flex-col gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-indigo">Visible to</h2>
          <p className="text-ink/55 text-sm mt-1">Choose which classes see and can take this exam.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={setAllClasses}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium border ${
              allowedClassIds.length === 0 ? 'bg-indigo text-cream border-indigo' : 'border-indigo/20 text-indigo/70'
            }`}
          >
            All classes
          </button>
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleClass(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border ${
                allowedClassIds.includes(c.id) ? 'bg-gold border-gold text-indigo-deep' : 'border-indigo/20 text-indigo/70'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-indigo">
          Questions <span className="text-ink/40 font-normal text-sm">({questions.length})</span>
        </h2>

        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            index={idx}
            question={q}
            onChange={(patch) => updateQuestionLocal(q.id, patch)}
            onDelete={() => removeQuestion(q.id)}
          />
        ))}

        <button onClick={addQuestion} className="btn-outline self-start">
          + Add question
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ index, question, onChange, onDelete }) {
  const persistQuestion = async (patch) => {
    onChange(patch)
    const merged = { ...question, ...patch }
    const { error } = await supabase
      .from('questions')
      .update({ question_html: merged.question_html, question_type: merged.question_type, points: merged.points })
      .eq('id', question.id)
    if (error) alert(error.message)
  }

  const changeType = async (newType) => {
    if (newType === 'true_false') {
      // True/False is a fixed pair — replace whatever options exist.
      await supabase.from('options').delete().eq('question_id', question.id)
      const { data } = await supabase
        .from('options')
        .insert([
          { question_id: question.id, option_order: 0, option_html: 'True', is_correct: false },
          { question_id: question.id, option_order: 1, option_html: 'False', is_correct: false }
        ])
        .select()
      await persistQuestion({ question_type: newType })
      onChange({ options: data || [] })
      return
    }
    await persistQuestion({ question_type: newType })
  }

  const addOption = async () => {
    const { data, error } = await supabase
      .from('options')
      .insert({ question_id: question.id, option_order: question.options.length, option_html: '', is_correct: false })
      .select()
      .single()
    if (error) return alert(error.message)
    onChange({ options: [...question.options, data] })
  }

  const updateOption = async (optId, patch) => {
    let nextOptions = question.options.map((o) => (o.id === optId ? { ...o, ...patch } : o))
    // single/true-false questions: enforce only one is_correct
    if (patch.is_correct && (question.question_type === 'single' || question.question_type === 'true_false')) {
      nextOptions = nextOptions.map((o) => (o.id === optId ? o : { ...o, is_correct: false }))
    }
    onChange({ options: nextOptions })
    const target = nextOptions.find((o) => o.id === optId)
    await supabase
      .from('options')
      .update({ option_html: target.option_html, is_correct: target.is_correct, match_text: target.match_text })
      .eq('id', optId)
    if (patch.is_correct && (question.question_type === 'single' || question.question_type === 'true_false')) {
      const others = nextOptions.filter((o) => o.id !== optId)
      await Promise.all(others.map((o) => supabase.from('options').update({ is_correct: false }).eq('id', o.id)))
    }
  }

  const removeOption = async (optId) => {
    const { error } = await supabase.from('options').delete().eq('id', optId)
    if (error) return alert(error.message)
    onChange({ options: question.options.filter((o) => o.id !== optId) })
  }

  const type = question.question_type

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="w-7 h-7 rounded-full bg-indigo/10 text-indigo text-sm font-semibold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          <select
            className="text-xs font-medium rounded-lg border border-indigo/15 px-2 py-1.5 bg-paper text-indigo"
            value={type}
            onChange={(e) => changeType(e.target.value)}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            title="Points"
            className="w-16 text-xs rounded-lg border border-indigo/15 px-2 py-1.5 bg-paper"
            value={question.points}
            onChange={(e) => persistQuestion({ points: Number(e.target.value) })}
          />
          <button onClick={onDelete} className="text-rose text-xs font-medium hover:underline">Delete</button>
        </div>
      </div>

      <RichEditor
        value={question.question_html}
        onChange={(html) => persistQuestion({ question_html: html })}
        placeholder="Type the question here. Use the image button to attach a picture…"
        uploadFolder={`questions/${question.id}`}
      />

      {(type === 'single' || type === 'multiple' || type === 'true_false') && (
        <div className="flex flex-col gap-2 pl-1">
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => updateOption(opt.id, { is_correct: !opt.is_correct })}
                title="Mark as correct"
                className={`mt-2.5 w-5 h-5 shrink-0 flex items-center justify-center border-2 text-[11px] font-bold ${
                  type === 'multiple' ? 'rounded-md' : 'rounded-full'
                } ${opt.is_correct ? 'bg-forest border-forest text-cream' : 'border-indigo/25 text-transparent'}`}
              >
                ✓
              </button>
              <div className="flex-1">
                {type === 'true_false' ? (
                  <div className="field !py-2.5 text-sm text-ink/70">{opt.option_html}</div>
                ) : (
                  <RichEditor
                    value={opt.option_html}
                    onChange={(html) => updateOption(opt.id, { option_html: html })}
                    placeholder="Option text…"
                    uploadFolder={`options/${opt.id}`}
                    compact
                  />
                )}
              </div>
              {type !== 'true_false' && (
                <button onClick={() => removeOption(opt.id)} className="mt-2 text-ink/30 hover:text-rose text-sm">✕</button>
              )}
            </div>
          ))}
          {type !== 'true_false' && (
            <button onClick={addOption} className="btn-ghost self-start !px-3 !py-1.5 text-xs">+ Add option</button>
          )}
        </div>
      )}

      {type === 'fill_blank' && (
        <div className="flex flex-col gap-2 pl-1">
          <p className="text-xs text-ink/45">
            List every wording you'll accept as correct (case doesn't matter). Students see a plain text box.
          </p>
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                className="field flex-1"
                value={stripHtml(opt.option_html)}
                onChange={(e) => updateOption(opt.id, { option_html: e.target.value })}
                placeholder="Accepted answer…"
              />
              <button onClick={() => removeOption(opt.id)} className="text-ink/30 hover:text-rose text-sm">✕</button>
            </div>
          ))}
          <button onClick={addOption} className="btn-ghost self-start !px-3 !py-1.5 text-xs">+ Add accepted answer</button>
        </div>
      )}

      {type === 'matching' && (
        <div className="flex flex-col gap-2 pl-1">
          <p className="text-xs text-ink/45">Each row: a term on the left, and what it correctly matches to on the right.</p>
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 flex-wrap">
              <input
                className="field flex-1 min-w-[140px]"
                value={stripHtml(opt.option_html)}
                onChange={(e) => updateOption(opt.id, { option_html: e.target.value })}
                placeholder="Term…"
              />
              <span className="text-ink/30 text-sm">matches</span>
              <input
                className="field flex-1 min-w-[140px]"
                value={opt.match_text || ''}
                onChange={(e) => updateOption(opt.id, { match_text: e.target.value })}
                placeholder="Correct match…"
              />
              <button onClick={() => removeOption(opt.id)} className="text-ink/30 hover:text-rose text-sm">✕</button>
            </div>
          ))}
          <button onClick={addOption} className="btn-ghost self-start !px-3 !py-1.5 text-xs">+ Add pair</button>
        </div>
      )}
    </div>
  )
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '')
}
