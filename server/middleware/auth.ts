import { readAuthSession } from '../utils/auth'

const publicPathPrefixes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/health',
  '/api/ready',
  '/api/db-check',
  '/_nuxt',
  '/favicon.ico'
]

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname

  if (publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return
  }

  if (readAuthSession(event)) {
    return
  }

  if (pathname.startsWith('/api/')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return sendRedirect(event, `/login?redirect=${encodeURIComponent(pathname)}`)
})
