import type { AgentEvent } from '../../../../../types/agent-event'
import { createMockAgentRun } from '../../../../services/agent-runtime'
import {
  completeMessageRun,
  getMessageRun,
  updateRunStatus
} from '../../../../services/run-store'
import { logAgentEvent, logger } from '../../../../utils/logger'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function writeSseEvent(res: typeof import('node:http').ServerResponse.prototype, event: AgentEvent) {
  res.write(`event: ${event.eventType}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')

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

  const res = event.node.res

  setResponseHeaders(event, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  })

  updateRunStatus(runId, 'running')

  const result = createMockAgentRun({
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
    message: 'Agent Run event stream started'
  })

  for (const agentEvent of result.events) {
    if (agentEvent.status) {
      updateRunStatus(runId, agentEvent.status)
    }

    logAgentEvent(agentEvent)
    writeSseEvent(res, agentEvent)
    await wait(260)
  }

  completeMessageRun(runId, result.events, result.finalAnswer)

  res.write('event: done\n')
  res.write('data: [DONE]\n\n')
  res.end()

  logger.info({
    eventType: 'agent_run_event_stream_completed',
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.runId,
    traceId: run.traceId,
    eventCount: result.events.length,
    message: 'Agent Run event stream completed'
  })
})
