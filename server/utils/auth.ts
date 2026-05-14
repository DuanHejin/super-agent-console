import { createHmac, timingSafeEqual } from 'node:crypto'
import { getAppRuntimeConfig } from './runtime-config'

const authCookieName = 'sac_auth'
const authSessionMaxAge = 60 * 60 * 24 * 7

export interface AuthSession {
  userId: string
  issuedAt: number
  isAdmin?: boolean
  nickname?: string
}

export function getAuthCookieName() {
  return authCookieName
}

export function getConfiguredAccessCodes() {
  const config = getAppRuntimeConfig()

  return parseAccessCodes(config.accessCodes)
}

export function getConfiguredAdminAccessCodes() {
  const config = getAppRuntimeConfig()

  return parseAccessCodes(config.adminAccessCodes)
}

function parseAccessCodes(value: string) {
  return value
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}

export function verifyAccessCode(accessCode: string) {
  const normalizedAccessCode = accessCode.trim()

  if (!normalizedAccessCode) {
    return false
  }

  return [...getConfiguredAccessCodes(), ...getConfiguredAdminAccessCodes()].some((configuredCode) =>
    safeEqual(configuredCode, normalizedAccessCode)
  )
}

export function isAdminAccessCode(accessCode: string) {
  const normalizedAccessCode = accessCode.trim()

  if (!normalizedAccessCode) {
    return false
  }

  return getConfiguredAdminAccessCodes().some((configuredCode) => safeEqual(configuredCode, normalizedAccessCode))
}

export function createAuthToken(accessCode: string, nickname?: string) {
  const session: AuthSession = {
    userId: `access_${hashText(accessCode).slice(0, 12)}`,
    issuedAt: Date.now(),
    isAdmin: isAdminAccessCode(accessCode)
  }

  if (nickname) {
    session.nickname = nickname
  }

  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const signature = signPayload(payload)

  return `${payload}.${signature}`
}

export function readAuthSession(event: Parameters<typeof getCookie>[0]): AuthSession | undefined {
  const token = getCookie(event, authCookieName)

  if (!token) {
    return undefined
  }

  const [payload, signature] = token.split('.')

  if (!payload || !signature || !safeEqual(signPayload(payload), signature)) {
    return undefined
  }

  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthSession
  const expired = Date.now() - session.issuedAt > authSessionMaxAge * 1000

  return expired ? undefined : session
}

export function canReadDebugLists(event: Parameters<typeof getCookie>[0]) {
  return process.env.NODE_ENV === 'development' || Boolean(readAuthSession(event)?.isAdmin)
}

export function setAuthSessionCookie(event: Parameters<typeof setCookie>[0], accessCode: string, nickname?: string) {
  setCookie(event, authCookieName, createAuthToken(accessCode, nickname), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: authSessionMaxAge
  })
}

export function clearAuthSessionCookie(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, authCookieName, {
    path: '/'
  })
}

function signPayload(payload: string) {
  const secret = getAppRuntimeConfig().authCookieSecret

  if (!secret) {
    throw new Error('AUTH_COOKIE_SECRET is required when access auth is enabled.')
  }

  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function hashText(text: string) {
  return createHmac('sha256', getAppRuntimeConfig().authCookieSecret || 'dev-auth-secret').update(text).digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
