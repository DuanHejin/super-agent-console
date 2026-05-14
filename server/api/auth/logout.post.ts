import { clearAuthSessionCookie } from '../../utils/auth'

export default defineEventHandler((event) => {
  clearAuthSessionCookie(event)

  return {
    ok: true
  }
})
