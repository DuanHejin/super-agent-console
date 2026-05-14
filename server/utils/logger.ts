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

  logger.info({
    eventId,
    eventType,
    runId,
    traceId,
    sequence,
    status,
    name,
    eventTimestamp: timestamp,
    message: message || eventType
  })
}
