import { listFeedbacks } from '../services/feedback-store'
import { canReadDebugLists } from '../utils/auth'

export default defineEventHandler(async (event) => {
  if (!canReadDebugLists(event)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'API not found'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)

  return {
    items: await listFeedbacks(limit)
  }
})
