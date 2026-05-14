import { listPersistedConversations } from '../../services/run-persistence'
import { listConversations } from '../../services/run-store'
import { canReadDebugLists } from '../../utils/auth'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  if (!canReadDebugLists(event)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'API not found'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)

  try {
    return {
      items: await listPersistedConversations(limit)
    }
  } catch (persistenceError) {
    logger.warn({
      eventType: 'conversation_list_read_persist_failed',
      errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
      message: 'Conversation list read from database failed, fallback to memory run-store'
    })

    return {
      items: listConversations(limit)
    }
  }
})
