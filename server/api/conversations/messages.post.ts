import type {
  CreateConversationMessageRequest,
  CreateConversationMessageResponse
} from '../../../types/agent-run'
import { createPersistedMessageRun } from '../../services/run-persistence'
import { createMessageRun, getMessageRun } from '../../services/run-store'
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

  const run = getMessageRun(response.runId)

  if (run) {
    try {
      await createPersistedMessageRun(run, response.idempotent)
    } catch (persistenceError) {
      logger.warn({
        eventType: 'agent_run_persist_failed',
        conversationId: response.conversationId,
        messageId: response.messageId,
        runId: response.runId,
        traceId: response.traceId,
        errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
        message: 'Agent Run persisted failed, fallback to memory run-store'
      })
    }
  }

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
