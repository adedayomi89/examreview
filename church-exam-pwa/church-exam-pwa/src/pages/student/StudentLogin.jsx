import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { useClasses } from '../../lib/useClasses.js'
import { BrandMark } from '../../components/Brand.jsx'
import PasswordField from '../../components/PasswordField.jsx'

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
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInStudent({ username, password })
      } else {
        await signUpStudent({ fullName, username, password, classId })
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
          {error && <p className="text-sm text-rose">{error}</p>}
          <button className="btn-primary w-full mt-1" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create my account'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/" className="text-indigo/50 text-xs hover:text-indigo">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}

function friendlyError(msg = '') {
  if (msg.includes('Invalid login credentials')) return 'Incorrect username or password.'
  if (msg.includes('already registered')) return 'That username is already taken — try signing in instead.'
  return msg
}
