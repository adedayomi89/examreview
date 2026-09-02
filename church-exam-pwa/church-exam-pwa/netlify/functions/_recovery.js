import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashRecoveryCode(code) {
  const salt = randomBytes(16)
  const hash = scryptSync(String(code).trim().toLowerCase(), salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyRecoveryCode(code, stored) {
  if (!stored || !stored.includes(':')) return false
  const [saltHex, hashHex] = stored.split(':')
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(String(code).trim().toLowerCase(), salt, 64)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
