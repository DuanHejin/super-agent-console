import { setAuthSessionCookie, verifyAccessCode } from '../../utils/auth'
import { logger } from '../../utils/logger'
import { getClientIp } from '../../utils/request-client'
import { getAppRuntimeConfig } from '../../utils/runtime-config'
import { checkRateLimit } from '../../services/rate-limit'

export default defineEventHandler(async (event) => {
  const config = getAppRuntimeConfig()
  const body = await readBody<{ accessCode?: string, nickname?: string }>(event)
  const accessCode = body.accessCode?.trim() ?? ''
  const nickname = body.nickname?.trim().slice(0, 40)
  const clientIp = getClientIp(event)

  if (!verifyAccessCode(accessCode)) {
    const failedLimit = checkRateLimit({
      key: `auth-login-failed:${clientIp}:minute`,
      limit: config.authLoginRateLimitMinute,
      windowMs: 60 * 1000
    })

    logger.warn({
      eventType: 'auth_login_failed',
      clientIp,
      remaining: failedLimit.remaining,
      message: 'Invalid access code login attempt'
    })

    if (!failedLimit.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many login attempts'
      })
    }

    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid access code'
    })
  }

  setAuthSessionCookie(event, accessCode, nickname)

  logger.info({
    eventType: 'auth_login_success',
    message: 'Access code login succeeded'
  })

  return {
    ok: true
  }
})
