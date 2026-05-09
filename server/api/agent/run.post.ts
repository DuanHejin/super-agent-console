import type { AgentEvent } from '../../../types/agent-event'
import { createMockAgentRun } from '../../services/agent-runtime'
import { logAgentEvent, logger } from '../../utils/logger'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function writeSseEvent(res: typeof import('node:http').ServerResponse.prototype, event: AgentEvent) {
  res.write(`event: ${event.eventType}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ input?: string }>(event)
  const input = body.input || ''
  const result = createMockAgentRun({ input })
  const res = event.node.res

  setResponseHeaders(event, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  })

  logger.info({
    eventType: 'agent_sse_stream_started',
    runId: result.runId,
    traceId: result.traceId,
    eventCount: result.events.length,
    message: 'Agent SSE stream started'
  })

  for (const agentEvent of result.events) {
    logAgentEvent(agentEvent)
    writeSseEvent(res, agentEvent)
    await wait(260)
  }

  res.write('event: done\n')
  res.write('data: [DONE]\n\n')
  res.end()

  logger.info({
    eventType: 'agent_sse_stream_completed',
    runId: result.runId,
    traceId: result.traceId,
    eventCount: result.events.length,
    message: 'Agent SSE stream completed'
  })
})
