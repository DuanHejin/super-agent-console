import { logger } from '../utils/logger'
import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`

    logger.info({
      eventType: 'db_check_success',
      message: 'Database connection check succeeded'
    })

    return {
      status: 'ok',
      database: 'connected'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    logger.error({
      eventType: 'db_check_error',
      errorMessage: message,
      message: 'Database connection check failed'
    })

    return {
      status: 'error',
      database: 'disconnected',
      message
    }
  }
})
