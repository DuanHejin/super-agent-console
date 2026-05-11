import type {
  CreateConversationMessageRequest,
  CreateConversationMessageResponse
} from '../../../types/agent-run'
import { createMessageRun } from '../../services/run-store'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event): Promise<CreateConversationMessageResponse> => {
  const body = await readBody<Partial<CreateConversationMessageRequest>>(event)
  const input = body.input?.trim()
  const clientRequestId = body.clientRequestId?.trim()

  if (!input) {
    throw createError({
      statusCode: 400,
      statusMessage: 'input is required'
    })
  }

  if (!clientRequestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'clientRequestId is required'
    })
  }

  const response = createMessageRun({
    conversationId: body.conversationId,
    input,
    clientRequestId
  })

  logger.info({
    eventType: 'agent_run_created',
    conversationId: response.conversationId,
    messageId: response.messageId,
    runId: response.runId,
    traceId: response.traceId,
    status: response.status,
    idempotent: response.idempotent,
    message: response.idempotent ? 'Existing Agent Run returned by idempotency key' : 'Agent Run created'
  })

  return response
})
