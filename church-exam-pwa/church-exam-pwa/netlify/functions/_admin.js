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
  const staff = await requireStaff(event)
  if (staff.role !== 'admin') throw { statusCode: 403, message: 'Admin access required.' }
  return staff.userId
}

// Verifies the request's Bearer token belongs to a signed-in admin OR
// teacher. Returns { userId, role, classIds } — classIds is the list of
// class ids a teacher is responsible for (empty array for admins, who are
// unrestricted).
export async function requireStaff(event) {
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

  if (profileErr || (profile?.role !== 'admin' && profile?.role !== 'teacher')) {
    throw { statusCode: 403, message: 'Staff access required.' }
  }

  let classIds = []
  if (profile.role === 'teacher') {
    const { data: rows } = await admin.from('teacher_classes').select('class_id').eq('teacher_id', userData.user.id)
    classIds = (rows || []).map((r) => r.class_id)
  }

  return { userId: userData.user.id, role: profile.role, classIds }
}

// For actions that must stay admin-only even though a teacher is otherwise
// "staff" (e.g. creating another teacher account).
export function assertAdmin(staff) {
  if (staff.role !== 'admin') throw { statusCode: 403, message: 'Admin access required.' }
}

// For a teacher acting on a specific student: makes sure that student is
// actually in one of the teacher's assigned classes. Admins always pass.
export async function assertCanManageStudent(admin, staff, studentId) {
  if (staff.role === 'admin') return
  const { data: target } = await admin.from('profiles').select('class_id').eq('id', studentId).single()
  if (!target || !target.class_id || !staff.classIds.includes(target.class_id)) {
    throw { statusCode: 403, message: "That student isn't in one of your classes." }
  }
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
