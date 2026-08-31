import { requireAdmin, serviceClient, json } from './_admin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    await requireAdmin(event)
    const { studentId } = JSON.parse(event.body || '{}')
    if (!studentId) return json(400, { error: 'studentId is required.' })

    const admin = serviceClient()
    const { error } = await admin.auth.admin.deleteUser(studentId)
    if (error) return json(400, { error: error.message })

    return json(200, { ok: true })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
