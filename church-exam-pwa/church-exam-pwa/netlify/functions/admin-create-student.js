import { requireAdmin, serviceClient, usernameToEmail, json } from './_admin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    await requireAdmin(event)
    const { fullName, username, password, classId } = JSON.parse(event.body || '{}')

    if (!fullName?.trim() || !username?.trim() || !password || password.length < 6) {
      return json(400, { error: 'Full name, username and a password of at least 6 characters are required.' })
    }

    const admin = serviceClient()
    const email = usernameToEmail(username)

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', full_name: fullName.trim(), username: username.trim(), class_id: classId || '' }
    })

    if (error) return json(400, { error: error.message })

    return json(200, { id: data.user.id })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
