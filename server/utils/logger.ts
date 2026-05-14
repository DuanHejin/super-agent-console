import pino from 'pino'
import type { AgentEvent } from '../../types/agent-event'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: process.env.APP_NAME || 'super-agent-console',
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime
})

export function logAgentEvent(event: AgentEvent) {
  const { eventId, eventType, runId, traceId, sequence, status, timestamp, name, message } = event
  const errorData = readAgentErrorData(event.data)

  logger.info({
    eventId,
    eventType,
    runId,
    traceId,
    sequence,
    status,
    name,
    ...errorData,
    eventTimestamp: timestamp,
    message: message || eventType
  })
}

function readAgentErrorData(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }

  const value = data as Record<string, unknown>

  return {
    ...(typeof value.errorMessage === 'string' ? { errorMessage: value.errorMessage } : {}),
    ...(typeof value.errorName === 'string' ? { errorName: value.errorName } : {}),
    ...(typeof value.phase === 'string' ? { phase: value.phase } : {}),
    ...(typeof value.provider === 'string' ? { provider: value.provider } : {}),
    ...(typeof value.model === 'string' ? { model: value.model } : {}),
    ...(typeof value.isTimeout === 'boolean' ? { isTimeout: value.isTimeout } : {}),
    ...(typeof value.requestTimeoutMs === 'number' ? { requestTimeoutMs: value.requestTimeoutMs } : {})
  }
}
