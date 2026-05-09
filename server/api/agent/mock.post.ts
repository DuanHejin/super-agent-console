import { logger } from '../../utils/logger'
import { runMockAgent } from '../../services/agent-runtime'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ input?: string }>(event)
  const input = body.input || ''

  const result = await runMockAgent({ input })

  logger.info({
    eventType: 'mock_agent_run_completed',
    runId: result.runId,
    traceId: result.traceId,
    eventCount: result.events.length,
    message: 'Mock agent run completed'
  })

  return result
})
