import { getMessageRun, toRunDetailResponse } from '../../../../services/run-store'

export default defineEventHandler((event) => {
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

  return toRunDetailResponse(run)
})
