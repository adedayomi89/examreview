import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { BrandMark } from '../../components/Brand.jsx'

const SETUP_CODE = import.meta.env.VITE_ADMIN_SETUP_CODE || ''

export default function AdminSignup() {
  const { signUpAdmin } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (SETUP_CODE && code !== SETUP_CODE) {
      setError('That setup code is incorrect.')
      return
    }
    setBusy(true)
    try {
      await signUpAdmin({ fullName, email, password })
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-deep flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <BrandMark size={56} />
          <h1 className="font-display text-xl text-cream font-semibold">Create the admin account</h1>
          <p className="text-cream/50 text-sm text-center">
            Only do this once, when first setting up the portal.
          </p>
        </div>

        <form onSubmit={submit} className="card bg-paper p-6 flex flex-col gap-4">
          <div>
            <label className="label">Your full name</label>
            <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="field"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {SETUP_CODE && (
            <div>
              <label className="label">Setup code</label>
              <input className="field" required value={code} onChange={(e) => setCode(e.target.value)} />
              <p className="text-xs text-ink/40 mt-1">Provided to you separately by whoever configured this site.</p>
            </div>
          )}
          {error && <p className="text-sm text-rose">{error}</p>}
          <button className="btn-primary w-full mt-1" disabled={busy}>
            {busy ? 'Creating account…' : 'Create admin account'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/admin/login" className="text-cream/50 text-xs hover:text-cream/80">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
