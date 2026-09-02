import { requireStaff, serviceClient, assertCanManageStudent, json } from './_admin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const staff = await requireStaff(event)
    const { studentId, newPassword } = JSON.parse(event.body || '{}')
    if (!studentId || !newPassword || newPassword.length < 6) {
      return json(400, { error: 'studentId and a newPassword of at least 6 characters are required.' })
    }

    const admin = serviceClient()
    await assertCanManageStudent(admin, staff, studentId)

    const { error } = await admin.auth.admin.updateUserById(studentId, { password: newPassword })
    if (error) return json(400, { error: error.message })

    return json(200, { ok: true })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
