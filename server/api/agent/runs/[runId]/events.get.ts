import type { AgentEvent } from '../../../../../types/agent-event'
import type { AgentRunStatus } from '../../../../../types/agent-run'
import { createDemoAgentRun, createRealAgentRunStream } from '../../../../services/agent-runtime'
import { acquireActiveRun } from '../../../../services/active-run-guard'
import {
  completePersistedMessageRun,
  persistAgentEvent,
  updatePersistedRunStatus
} from '../../../../services/run-persistence'
import {
  appendRunEvent,
  completeMessageRun,
  getMessageRun,
  updateRunStatus
} from '../../../../services/run-store'
import { logAgentEvent, logger } from '../../../../utils/logger'
import { getAppRuntimeConfig } from '../../../../utils/runtime-config'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveIntervalMs(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsed = Number(rawValue)

  if (!Number.isFinite(parsed)) {
    return 800
  }

  return Math.min(Math.max(parsed, 100), 5000)
}

function writeSseEvent(res: typeof import('node:http').ServerResponse.prototype, event: AgentEvent) {
  res.write(`event: ${event.eventType}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')
  const query = getQuery(event)
  const intervalMs = resolveIntervalMs(query.intervalMs)
  const runtimeConfig = getAppRuntimeConfig()

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'runId is required'
    })
  }

  const run = getMessageRun(runId)

  if (!run) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Agent Run not found'
    })
  }

  const userActiveRun = acquireActiveRun({
    key: `user:${run.userId}`,
    runId: run.runId,
    limit: runtimeConfig.concurrentRunsPerUser
  })

  if (!userActiveRun.allowed) {
    logger.warn({
      eventType: 'agent_run_concurrent_limited',
      runId: run.runId,
      userId: run.userId,
      activeCount: userActiveRun.activeCount,
      message: 'Agent Run SSE rejected by user concurrency limit'
    })

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many active Agent Runs'
    })
  }

  const globalActiveRun = acquireActiveRun({
    key: 'global',
    runId: run.runId,
    limit: runtimeConfig.concurrentRunsGlobal
  })

  if (!globalActiveRun.allowed) {
    userActiveRun.release()
    logger.warn({
      eventType: 'agent_run_concurrent_limited',
      runId: run.runId,
      userId: run.userId,
      activeCount: globalActiveRun.activeCount,
      message: 'Agent Run SSE rejected by global concurrency limit'
    })

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many active Agent Runs'
    })
  }

  const res = event.node.res
  let activeRunReleased = false

  const releaseActiveRun = () => {
    if (activeRunReleased) {
      return
    }

    activeRunReleased = true
    userActiveRun.release()
    globalActiveRun.release()
  }

  res.once('close', releaseActiveRun)

  setResponseHeaders(event, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  })

  updateRunStatus(runId, 'running')
  try {
    await updatePersistedRunStatus(runId, 'running')
  } catch (persistenceError) {
    logger.warn({
      eventType: 'agent_run_status_persist_failed',
      runId,
      errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
      message: 'Agent Run status persisted failed, fallback to memory run-store'
    })
  }

  const emittedEvents: AgentEvent[] = []
  let finalAnswer = ''

  const handleAgentEvent = async (agentEvent: AgentEvent) => {
    emittedEvents.push(agentEvent)
    updateRunStatus(runId, agentEvent.status)
    appendRunEvent(runId, agentEvent)
    try {
      await persistAgentEvent(agentEvent)
    } catch (persistenceError) {
      logger.warn({
        eventType: 'agent_event_persist_failed',
        eventId: agentEvent.eventId,
        agentEventType: agentEvent.eventType,
        runId: agentEvent.runId,
        traceId: agentEvent.traceId,
        sequence: agentEvent.sequence,
        errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
        message: 'AgentEvent persisted failed, fallback to memory run-store'
      })
    }
    logAgentEvent(agentEvent)
    writeSseEvent(res, agentEvent)
  }

  if (runtimeConfig.modelProvider === 'volcengine_ark') {
    const realStream = createRealAgentRunStream({
      input: run.input,
      conversationId: run.conversationId,
      messageId: run.messageId,
      runId: run.runId,
      traceId: run.traceId,
      modelProvider: 'volcengine_ark',
      modelName: runtimeConfig.modelName,
      modelBaseUrl: runtimeConfig.modelBaseUrl,
      modelApiKey: runtimeConfig.modelApiKey,
      temperature: runtimeConfig.modelTemperature,
      topP: runtimeConfig.modelTopP,
      maxTokens: runtimeConfig.modelMaxTokens,
      timeoutMs: runtimeConfig.modelRequestTimeoutMs
    })

    logger.info({
      eventType: 'agent_run_event_stream_started',
      conversationId: run.conversationId,
      messageId: run.messageId,
      runId: run.runId,
      traceId: run.traceId,
      provider: realStream.provider,
      model: realStream.modelName,
      message: 'Real Agent Run event stream started'
    })

    for await (const agentEvent of realStream.events) {
      await handleAgentEvent(agentEvent)
    }

    finalAnswer = realStream.getFinalAnswer()
  } else {
    const result = await createDemoAgentRun({
      input: run.input,
      conversationId: run.conversationId,
      messageId: run.messageId,
      runId: run.runId,
      traceId: run.traceId
    })

    logger.info({
      eventType: 'agent_run_event_stream_started',
      conversationId: run.conversationId,
      messageId: run.messageId,
      runId: run.runId,
      traceId: run.traceId,
      eventCount: result.events.length,
      intervalMs,
      message: 'Demo Agent Run event stream started'
    })

    for (const agentEvent of result.events) {
      await handleAgentEvent(agentEvent)
      await wait(intervalMs)
    }

    finalAnswer = result.finalAnswer
  }

  const finalStatus: AgentRunStatus = emittedEvents.at(-1)?.status ?? 'running'

  if (finalStatus === 'completed') {
    completeMessageRun(runId, emittedEvents, finalAnswer)
    try {
      await completePersistedMessageRun(runId, finalAnswer)
    } catch (persistenceError) {
      logger.warn({
        eventType: 'agent_run_complete_persist_failed',
        runId,
        traceId: run.traceId,
        errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
        message: 'Agent Run completion persisted failed, fallback to memory run-store'
      })
    }
  } else {
    updateRunStatus(runId, finalStatus)
    try {
      await updatePersistedRunStatus(runId, finalStatus)
    } catch (persistenceError) {
      logger.warn({
        eventType: 'agent_run_status_persist_failed',
        runId,
        traceId: run.traceId,
        errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
        message: 'Agent Run final status persisted failed, fallback to memory run-store'
      })
    }
  }

  res.write('event: done\n')
  res.write('data: [DONE]\n\n')
  res.end()

  logger.info({
    eventType: 'agent_run_event_stream_completed',
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.runId,
    traceId: run.traceId,
    eventCount: emittedEvents.length,
    status: finalStatus,
    message: 'Agent Run event stream completed'
  })

  releaseActiveRun()
})
