import { readAuthSession } from '../../utils/auth'

export default defineEventHandler((event) => {
  const session = readAuthSession(event)

  return {
    authenticated: Boolean(session),
    userId: session?.userId,
    isAdmin: Boolean(session?.isAdmin),
    nickname: session?.nickname
  }
})
