import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { adminCreateTeacher, adminDeleteTeacher } from '../../lib/adminApi.js'
import { useClasses } from '../../lib/useClasses.js'
import PasswordField from '../../components/PasswordField.jsx'

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const { classes } = useClasses()

  const load = async () => {
    const { data: teacherProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('full_name')
    const { data: links } = await supabase.from('teacher_classes').select('teacher_id, classes(name)')
    const byTeacher = {}
    ;(links || []).forEach((l) => {
      byTeacher[l.teacher_id] = byTeacher[l.teacher_id] || []
      byTeacher[l.teacher_id].push(l.classes?.name)
    })
    setTeachers((teacherProfiles || []).map((t) => ({ ...t, classNames: byTeacher[t.id] || [] })))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (teacher) => {
    if (!confirm(`Remove ${teacher.full_name} as a teacher? This deletes their account (not their students).`)) return
    try {
      await adminDeleteTeacher(teacher.id)
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-indigo">Teachers</h1>
          <p className="text-ink/55 text-sm mt-1">
            Give class teachers their own login to manage just their class's students and results.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add teacher</button>
      </div>

      <div className="card overflow-hidden">
        {teachers === null ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : teachers.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No teacher accounts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/45 text-xs uppercase tracking-wide border-b border-indigo/8">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Class(es)</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-indigo/6 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{t.full_name}</td>
                  <td className="px-5 py-3 text-ink/60">
                    {t.classNames.length ? t.classNames.join(', ') : <span className="text-rose/70">None assigned</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="btn-ghost !px-3 !py-1.5 text-xs text-rose" onClick={() => handleDelete(t)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddTeacherModal
          classes={classes}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function AddTeacherModal({ classes, onClose, onCreated }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [classIds, setClassIds] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggleClass = (id) => {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await adminCreateTeacher({ fullName, email, password, classIds })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" onClick={onClose}>
      <div className="card bg-paper w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold text-indigo mb-4">Add a teacher</h3>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Full name</label>
            <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <PasswordField required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Class(es) they'll manage</label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium border ${
                    classIds.includes(c.id) ? 'bg-gold border-gold text-indigo-deep' : 'border-indigo/20 text-indigo/70'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          <div className="flex gap-3 mt-1">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Adding…' : 'Add teacher'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
