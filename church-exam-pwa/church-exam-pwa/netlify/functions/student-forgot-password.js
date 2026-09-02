import { serviceClient, json } from './_admin.js'
import { verifyRecoveryCode } from './_recovery.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const { username, recoveryCode, newPassword } = JSON.parse(event.body || '{}')
    if (!username?.trim() || !recoveryCode || !newPassword || newPassword.length < 6) {
      return json(400, { error: 'Username, recovery code, and a new password of at least 6 characters are required.' })
    }

    const admin = serviceClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, recovery_hash')
      .eq('username', username.trim())
      .eq('role', 'student')
      .maybeSingle()

    // Same generic error whether the username doesn't exist or the code is
    // wrong — avoids confirming which usernames are real.
    const genericError = 'Username or recovery code is incorrect.'

    if (!profile || !profile.recovery_hash) return json(400, { error: genericError })
    if (!verifyRecoveryCode(recoveryCode, profile.recovery_hash)) return json(400, { error: genericError })

    const { error } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword })
    if (error) return json(400, { error: error.message })

    return json(200, { ok: true })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
