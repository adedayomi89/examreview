import { requireStaff, assertAdmin, serviceClient, json } from './_admin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const staff = await requireStaff(event)
    assertAdmin(staff)

    const { fullName, email, password, classIds } = JSON.parse(event.body || '{}')
    if (!fullName?.trim() || !email?.trim() || !password || password.length < 6) {
      return json(400, { error: 'Full name, email and a password of at least 6 characters are required.' })
    }

    const admin = serviceClient()
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher', full_name: fullName.trim() }
    })
    if (error) return json(400, { error: error.message })

    const ids = Array.isArray(classIds) ? classIds.filter(Boolean) : []
    if (ids.length) {
      const { error: linkErr } = await admin
        .from('teacher_classes')
        .insert(ids.map((class_id) => ({ teacher_id: data.user.id, class_id })))
      if (linkErr) return json(400, { error: linkErr.message })
    }

    return json(200, { id: data.user.id })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
