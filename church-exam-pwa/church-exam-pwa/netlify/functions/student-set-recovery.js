import { serviceClient, json } from './_admin.js'
import { hashRecoveryCode } from './_recovery.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const auth = event.headers.authorization || event.headers.Authorization
    const token = auth?.replace(/^Bearer\s+/i, '')
    if (!token) return json(401, { error: 'Missing Authorization header.' })

    const { recoveryCode } = JSON.parse(event.body || '{}')
    if (!recoveryCode || recoveryCode.trim().length < 6) {
      return json(400, { error: 'Recovery code must be at least 6 characters.' })
    }

    const admin = serviceClient()
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json(401, { error: 'Invalid or expired session.' })

    const { error } = await admin
      .from('profiles')
      .update({ recovery_hash: hashRecoveryCode(recoveryCode) })
      .eq('id', userData.user.id)
    if (error) return json(400, { error: error.message })

    return json(200, { ok: true })
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || 'Something went wrong.' })
  }
}
