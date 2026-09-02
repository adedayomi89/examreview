import { supabase } from './supabaseClient'

// Called right after a student signs up, while their fresh session is active.
export async function studentSetRecovery(recoveryCode) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const res = await fetch('/api/student-set-recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recoveryCode })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not save your recovery code.')
  return body
}

// Called from the "forgot password" form — the student isn't signed in yet,
// so this needs no auth token.
export async function studentForgotPassword({ username, recoveryCode, newPassword }) {
  const res = await fetch('/api/student-forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, recoveryCode, newPassword })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not reset your password.')
  return body
}
