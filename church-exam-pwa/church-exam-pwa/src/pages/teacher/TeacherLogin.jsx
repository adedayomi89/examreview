import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { BrandMark } from '../../components/Brand.jsx'
import PasswordField from '../../components/PasswordField.jsx'

export default function TeacherLogin() {
  const { signInAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInAdmin({ email, password })
      navigate('/teacher')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-deep flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <BrandMark size={56} />
          <h1 className="font-display text-xl text-cream font-semibold">Teacher sign in</h1>
          <p className="text-cream/50 text-sm text-center">Manage your class's students and results</p>
        </div>

        <form onSubmit={submit} className="card bg-paper p-6 flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input
              className="field"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <PasswordField required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          <button className="btn-primary w-full mt-1" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center mt-5 text-cream/40 text-xs">
          Your admin sets up your account and assigns your class — there's no self-signup here.
        </p>
        <div className="text-center mt-2">
          <Link to="/" className="text-cream/50 text-xs hover:text-cream/80">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
