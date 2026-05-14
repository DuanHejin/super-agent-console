import { createFeedback } from '../services/feedback-store'
import { readAuthSession } from '../utils/auth'
import { logger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    content?: string
    contact?: string
    pageUrl?: string
  }>(event)
  const content = body.content?.trim() ?? ''
  const contact = body.contact?.trim()
  const pageUrl = body.pageUrl?.trim()
  const session = readAuthSession(event)

  if (content.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'feedback content is required'
    })
  }

  if (content.length > 2000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'feedback content is too long'
    })
  }

  const result = await createFeedback({
    userId: session?.userId,
    nickname: session?.nickname,
    content,
    contact,
    pageUrl,
    userAgent: getHeader(event, 'user-agent')
  })

  logger.info({
    eventType: 'feedback_created',
    feedbackId: result.id,
    userId: session?.userId,
    message: 'Feedback created'
  })

  return {
    ok: true,
    feedbackId: result.id
  }
})
