import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { adminCreateStudent, adminDeleteStudent, adminResetPassword } from '../../lib/adminApi.js'
import PasswordField from '../../components/PasswordField.jsx'

export default function TeacherStudents() {
  const { teacherClassIds } = useAuth()
  const [students, setStudents] = useState(null)
  const [classNames, setClassNames] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)

  const load = async () => {
    if (teacherClassIds.length === 0) {
      setStudents([])
      return
    }
    const [{ data }, { data: classData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').in('class_id', teacherClassIds).order('full_name'),
      supabase.from('classes').select('*').in('id', teacherClassIds)
    ])
    setStudents(data || [])
    setClassNames(Object.fromEntries((classData || []).map((c) => [c.id, c.name])))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherClassIds.join(',')])

  const handleDelete = async (student) => {
    if (!confirm(`Remove ${student.full_name}? This deletes their account and exam history.`)) return
    try {
      await adminDeleteStudent(student.id)
      setStudents((s) => s.filter((x) => x.id !== student.id))
    } catch (err) {
      alert(err.message)
    }
  }

  if (teacherClassIds.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink/60">
          You don't have a class assigned yet — ask your admin to assign one from Admin → Teachers.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-indigo">My students</h1>
          <p className="text-ink/55 text-sm mt-1">{Object.values(classNames).join(', ')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add student</button>
      </div>

      <div className="card overflow-hidden">
        {students === null ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : students.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No students in your class yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/45 text-xs uppercase tracking-wide border-b border-indigo/8">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Username</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-indigo/6 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{s.full_name}</td>
                  <td className="px-5 py-3 text-ink/60">{s.username}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setResetTarget(s)}>Reset password</button>
                      <button className="btn-ghost !px-3 !py-1.5 text-xs text-rose" onClick={() => handleDelete(s)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          classNames={classNames}
          onClose={() => setShowAdd(false)}
          onCreated={(s) => {
            setStudents((prev) => [...(prev || []), s])
            setShowAdd(false)
          }}
        />
      )}
      {resetTarget && <ResetPasswordModal student={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  )
}

function AddStudentModal({ classNames, onClose, onCreated }) {
  const classIds = Object.keys(classNames)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [classId, setClassId] = useState(classIds[0] || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { id } = await adminCreateStudent({ fullName, username, password, classId })
      onCreated({ id, full_name: fullName, username, class_id: classId, created_at: new Date().toISOString() })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add a student">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label">Full name</label>
          <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Username</label>
          <input className="field" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. tola.james" />
        </div>
        {classIds.length > 1 && (
          <div>
            <label className="label">Class</label>
            <select className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classIds.map((id) => (
                <option key={id} value={id}>{classNames[id]}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Temporary password</label>
          <PasswordField required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose">{error}</p>}
        <div className="flex gap-3 mt-1">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Adding…' : 'Add student'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ student, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await adminResetPassword(student.id, newPassword)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Reset password — ${student.full_name}`}>
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/70">Password updated. Share the new password with <strong>{student.username}</strong> directly.</p>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">New password</label>
            <PasswordField required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          <div className="flex gap-3 mt-1">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" onClick={onClose}>
      <div className="card bg-paper w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold text-indigo mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}
