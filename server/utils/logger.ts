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
  const { eventType, runId, traceId, sequence, timestamp, message } = event

  logger.info({
    eventType,
    runId,
    traceId,
    sequence,
    eventTimestamp: timestamp,
    message: message || eventType
  })
}
