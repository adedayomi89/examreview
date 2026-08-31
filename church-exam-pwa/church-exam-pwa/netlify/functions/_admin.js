import { createClient } from '@supabase/supabase-js'

// Uses the SERVICE ROLE key — never exposed to the browser. Set this in
// Netlify (Site configuration -> Environment variables) as SUPABASE_SERVICE_ROLE_KEY
// and SUPABASE_URL. These must NOT have the VITE_ prefix, or Vite would bundle
// them into client-side JS.
export function serviceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Verifies the request's Bearer token belongs to a signed-in admin.
// Returns the admin's user id, or throws a { statusCode, message } error.
export async function requireAdmin(event) {
  const auth = event.headers.authorization || event.headers.Authorization
  const token = auth?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw { statusCode: 401, message: 'Missing Authorization header.' }
  }

  const admin = serviceClient()
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    throw { statusCode: 401, message: 'Invalid or expired session.' }
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileErr || profile?.role !== 'admin') {
    throw { statusCode: 403, message: 'Admin access required.' }
  }

  return userData.user.id
}

export function usernameToEmail(username) {
  const clean = String(username)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  return `${clean}@students.corsundayschool.app`
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }
}
