import type {
  CreateConversationMessageRequest,
  CreateConversationMessageResponse
} from '../../../types/agent-run'
import { createPersistedMessageRun } from '../../services/run-persistence'
import { checkRateLimit } from '../../services/rate-limit'
import { createMessageRun, getMessageRun } from '../../services/run-store'
import { readAuthSession } from '../../utils/auth'
import { logger } from '../../utils/logger'
import { getAppRuntimeConfig } from '../../utils/runtime-config'

export default defineEventHandler(async (event): Promise<CreateConversationMessageResponse> => {
  const config = getAppRuntimeConfig()
  const session = readAuthSession(event)
  const body = await readBody<Partial<CreateConversationMessageRequest>>(event)
  const input = body.input?.trim()
  const clientRequestId = body.clientRequestId?.trim()

  if (!config.modelEnabled) {
    logger.warn({
      eventType: 'agent_run_model_disabled',
      userId: session?.userId,
      message: 'Agent Run create request rejected because model is disabled'
    })

    throw createError({
      statusCode: 503,
      statusMessage: 'Model disabled',
      data: {
        message: '模型能力暂时关闭，请稍后再试。'
      }
    })
  }

  if (!input) {
    throw createError({
      statusCode: 400,
      statusMessage: 'input is required'
    })
  }

  if (input.length > config.maxRunInputLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `input length must be less than or equal to ${config.maxRunInputLength}`
    })
  }

  if (!clientRequestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'clientRequestId is required'
    })
  }

  const rateLimitKey = session?.userId ?? 'anonymous'
  const minuteLimit = checkRateLimit({
    key: `${rateLimitKey}:minute`,
    limit: config.runRateLimitMinute,
    windowMs: 60 * 1000
  })
  const dayLimit = checkRateLimit({
    key: `${rateLimitKey}:day`,
    limit: config.runRateLimitDay,
    windowMs: 24 * 60 * 60 * 1000
  })
  const globalMinuteLimit = checkRateLimit({
    key: 'global:run:minute',
    limit: config.globalRunRateLimitMinute,
    windowMs: 60 * 1000
  })
  const globalDayLimit = checkRateLimit({
    key: 'global:run:day',
    limit: config.globalRunRateLimitDay,
    windowMs: 24 * 60 * 60 * 1000
  })

  if (!minuteLimit.allowed || !dayLimit.allowed || !globalMinuteLimit.allowed || !globalDayLimit.allowed) {
    logger.warn({
      eventType: 'agent_run_rate_limited',
      userId: rateLimitKey,
      minuteRemaining: minuteLimit.remaining,
      dayRemaining: dayLimit.remaining,
      globalMinuteRemaining: globalMinuteLimit.remaining,
      globalDayRemaining: globalDayLimit.remaining,
      message: 'Agent Run create request rejected by rate limit'
    })

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many Agent Run requests'
    })
  }

  const response = createMessageRun({
    conversationId: body.conversationId,
    input,
    clientRequestId,
    userId: rateLimitKey
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
