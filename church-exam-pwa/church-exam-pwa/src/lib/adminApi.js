import { supabase } from './supabaseClient'

async function callFn(name, payload) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Request failed.')
  return body
}

export const adminCreateStudent = (payload) => callFn('admin-create-student', payload)
export const adminDeleteStudent = (studentId) => callFn('admin-delete-student', { studentId })
export const adminResetPassword = (studentId, newPassword) =>
  callFn('admin-reset-password', { studentId, newPassword })
