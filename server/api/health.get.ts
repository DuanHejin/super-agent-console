import { logger } from '../utils/logger'
import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  logger.info({
    eventType: 'health_check',
    message: 'Health check succeeded'
  })

  return {
    status: 'ok',
    service: config.appName,
    timestamp: new Date().toISOString()
  }
})
