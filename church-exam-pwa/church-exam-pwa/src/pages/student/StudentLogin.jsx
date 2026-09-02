import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { useClasses } from '../../lib/useClasses.js'
import { BrandMark } from '../../components/Brand.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import { studentSetRecovery, studentForgotPassword } from '../../lib/studentApi.js'

export default function StudentLogin() {
  const { signInStudent, signUpStudent } = useAuth()
  const { settings } = useSettings()
  const { classes } = useClasses()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [classId, setClassId] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInStudent({ username, password })
      } else {
        await signUpStudent({ fullName, username, password, classId })
        // Best-effort — a student can still use the app fine even if this
        // one call fails; they just won't have self-service recovery set up.
        try {
          await studentSetRecovery(recoveryCode)
        } catch {
          /* not fatal */
        }
      }
      navigate('/student')
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-radiant flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <BrandMark size={64} />
          <h1 className="font-display text-xl text-indigo font-semibold text-center">
            {settings.church_name}
          </h1>
          <p className="text-ink/55 text-sm">{settings.department_name}</p>
        </div>

        <div className="flex bg-indigo/8 rounded-full p-1 mb-5">
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-paper text-indigo shadow-card' : 'text-indigo/50'}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-paper text-indigo shadow-card' : 'text-indigo/50'}`}
            onClick={() => setMode('signup')}
          >
            First time
          </button>
        </div>

        <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Your full name</label>
              <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label className="label">Your class</label>
              <select className="field" required value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="" disabled>Select your class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Username</label>
            <input
              className="field"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'signup' ? 'Choose a username' : 'Your username'}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <PasswordField
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : '••••••••'}
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="label">Recovery code</label>
              <PasswordField
                required
                minLength={6}
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="A memorable word only you know"
              />
              <p className="text-xs text-ink/40 mt-1">
                Not your password — a backup word or phrase you'll use later if you forget your password. Remember it or write it down somewhere safe.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-rose">{error}</p>}
          <button className="btn-primary w-full mt-1" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create my account'}
          </button>
          {mode === 'login' && (
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-indigo/50 hover:text-indigo -mt-1">
              Forgot your password?
            </button>
          )}
        </form>

        <div className="text-center mt-5">
          <Link to="/" className="text-indigo/50 text-xs hover:text-indigo">← Back to home</Link>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}

function ForgotPasswordModal({ onClose }) {
  const [username, setUsername] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await studentForgotPassword({ username, recoveryCode, newPassword })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" onClick={onClose}>
      <div className="card bg-paper w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold text-indigo mb-1">Reset your password</h3>
        {done ? (
          <div className="flex flex-col gap-4 mt-3">
            <p className="text-sm text-ink/70">Your password has been reset — you can sign in with your new one now.</p>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p className="text-ink/55 text-sm mb-4">Enter your username and the recovery code you set when you signed up.</p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="label">Username</label>
                <input className="field" required value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="label">Recovery code</label>
                <PasswordField required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
              </div>
              <div>
                <label className="label">New password</label>
                <PasswordField required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-rose">{error}</p>}
              <div className="flex gap-3 mt-1">
                <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button>
              </div>
              <p className="text-xs text-ink/40 text-center">
                Don't remember your recovery code either? Ask your admin or class teacher to reset it for you.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function friendlyError(msg = '') {
  if (msg.includes('Invalid login credentials')) return 'Incorrect username or password.'
  if (msg.includes('already registered')) return 'That username is already taken — try signing in instead.'
  return msg
}
