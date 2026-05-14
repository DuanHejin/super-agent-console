import { getPersistedRunDetail } from '../../../../services/run-persistence'
import { getMessageRun, toRunDetailResponse } from '../../../../services/run-store'
import { logger } from '../../../../utils/logger'

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'runId is required'
    })
  }

  try {
    const persistedRun = await getPersistedRunDetail(runId)

    if (persistedRun) {
      return persistedRun
    }
  } catch (persistenceError) {
    logger.warn({
      eventType: 'agent_run_detail_read_persist_failed',
      runId,
      errorMessage: persistenceError instanceof Error ? persistenceError.message : 'Unknown persistence error',
      message: 'Agent Run detail read from database failed, fallback to memory run-store'
    })
  }

  const run = getMessageRun(runId)

  if (!run) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Agent Run not found'
    })
  }

  return toRunDetailResponse(run)
})
